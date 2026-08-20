import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import pdfParse from "pdf-parse";
import { createClient } from "@/lib/supabase/server";
import type { Book, KnowledgePackage } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

// Receives JSON after the PDF has been uploaded directly to Supabase Storage by the client.
// Only handles text extraction + DB writes — the large PDF never passes through Vercel.
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json();
  const { slug, storagePath, title, author: authorValue } = body as {
    slug: string;
    storagePath: string;
    title: string;
    author?: string;
  };

  if (!slug || !storagePath || !title) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  // Download PDF from Supabase Storage for text extraction
  const { data: pdfBlob, error: downloadError } = await supabase.storage
    .from("bookmind")
    .download(storagePath);

  if (downloadError || !pdfBlob) {
    return NextResponse.json({ error: "Failed to read uploaded PDF." }, { status: 500 });
  }

  const bytes = Buffer.from(await pdfBlob.arrayBuffer());
  const extractedText = await extractPdfText(bytes);
  const wordCount = countWords(extractedText);

  // Store extracted text in Supabase Storage
  await supabase.storage
    .from("bookmind")
    .upload(`${user.id}/source/${slug}.txt`, extractedText, { contentType: "text/plain", upsert: true });

  const author = (authorValue || "Unknown Author").trim() || "Unknown Author";

  const book: Book = {
    slug,
    title,
    author,
    category: "Uploaded",
    cover: slug,
    readingTime: estimateReadingTime(wordCount),
    status: "extracted",
    progress: 0,
    addedAt: new Date().toISOString(),
    pdfPath: storagePath
  };

  const { error: dbError } = await supabase.from("books").insert({
    user_id: user.id,
    slug,
    title,
    author,
    status: "extracted",
    progress: 0,
    added_at: book.addedAt,
    metadata: {
      category: "Uploaded",
      cover: slug,
      readingTime: book.readingTime,
      pdfPath: storagePath,
      wordCount
    }
  });

  if (dbError) {
    return NextResponse.json({ error: "Failed to save book." }, { status: 500 });
  }

  await supabase.from("knowledge").insert({
    user_id: user.id,
    slug,
    key: "package",
    data: createPlaceholderKnowledge(book, wordCount)
  });

  revalidatePath("/");
  revalidatePath("/library");

  return NextResponse.json({ book });
}

// Returns true if the extracted text looks like real language content.
// Broken-font PDFs produce Dingbats/Symbol characters (U+2600–U+27FF)
// instead of readable text — English and Unicode Hindi never contain these.
function isTextReadable(text: string): boolean {
  const sample = text.slice(0, 2000).replace(/\s/g, "");
  if (sample.length === 0) return false;
  const symbolCount = [...sample].filter((c) => {
    const code = c.charCodeAt(0);
    return (code >= 0x2600 && code <= 0x27FF) || (code >= 0xE000 && code <= 0xF8FF);
  }).length;
  return symbolCount / sample.length < 0.1;
}

// Sends the PDF to Gemini as an inline document and asks it to OCR the text.
// Only called when pdf-parse produces unreadable symbols (broken font encoding).
async function extractWithGeminiOCR(pdfBytes: Buffer): Promise<string | null> {
  const apiKey = process.env.GOOGLE_API_KEY?.split(",")[0].trim();
  if (!apiKey) return null;
  try {
    const base64Pdf = pdfBytes.toString("base64");
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: [
              { inlineData: { mimeType: "application/pdf", data: base64Pdf } },
              { text: "Extract ALL text from this document exactly as written. Preserve the original language and script. Return only the extracted text with no commentary or formatting." }
            ]
          }],
          generationConfig: { temperature: 0, maxOutputTokens: 65536 }
        })
      }
    );
    if (!res.ok) return null;
    const data = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim();
    return text && text.length > 100 ? text : null;
  } catch {
    return null;
  }
}

async function extractPdfText(bytes: Buffer) {
  const result = await pdfParse(bytes);
  const text = result.text.trim();

  if (!text) {
    return "No selectable text was extracted from this PDF. It may be scanned or image-based.";
  }

  // If pdf-parse returned symbols instead of text (broken proprietary font encoding),
  // fall back to Gemini OCR. English and Unicode books never trigger this path.
  if (!isTextReadable(text)) {
    const ocrText = await extractWithGeminiOCR(bytes);
    if (ocrText) return ocrText;
  }

  return text;
}

function countWords(text: string) {
  return text.split(/\s+/).filter(Boolean).length;
}

function estimateReadingTime(wordCount: number) {
  if (wordCount <= 0) return "Text extracted";
  const minutes = Math.max(1, Math.ceil(wordCount / 225));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

function createPlaceholderKnowledge(book: Book, wordCount: number): KnowledgePackage {
  return {
    book,
    thesis: "This PDF has been uploaded and its text has been extracted. Knowledge generation is the next step.",
    framework: "Extracted source text is stored and will be transformed into learning modes, concepts, examples, chapters, and actions.",
    overview: [
      "The source PDF is stored in Supabase Storage.",
      `BookMind extracted approximately ${wordCount.toLocaleString()} words from the PDF.`,
      "The next step is AI knowledge generation."
    ],
    learningModes: [
      { slug: "1", label: "Flash", title: "Learn in 1 Minute", duration: "1 min", summary: "Pending knowledge generation.", sections: [{ title: "Extracted", items: ["Upload complete.", "Source text extracted.", "Knowledge generation is next."] }] },
      { slug: "10", label: "Core", title: "Learn in 10 Minutes", duration: "10 min", summary: "Pending knowledge generation.", sections: [{ title: "Extracted", items: ["Core framework will be generated from the extracted text."] }] },
      { slug: "30", label: "Deep", title: "Learn in 30 Minutes", duration: "30 min", summary: "Pending knowledge generation.", sections: [{ title: "Extracted", items: ["Detailed understanding will be generated from the extracted text."] }] },
      { slug: "full", label: "Library", title: "Full Depth", duration: "Full", summary: "Pending knowledge generation.", sections: [{ title: "Extracted", items: ["Full knowledge package generation is queued."] }] }
    ],
    journey: [{ title: "Extracted", description: "The PDF has been saved and converted into source text." }],
    contents: [{ title: "Pending Generation", chapters: ["Chapter hierarchy will be generated from extracted source text."] }],
    chapters: [],
    concepts: [],
    examples: [],
    actions: {
      tomorrow: ["Review extracted source text."],
      thisWeek: ["Generate the first knowledge package."],
      thisMonth: ["Refine examples and chapter navigation."]
    }
  };
}
