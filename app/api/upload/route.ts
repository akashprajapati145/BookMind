import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import pdfParse from "pdf-parse";
import { createClient } from "@/lib/supabase/server";
import type { Book, KnowledgePackage } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

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

async function extractPdfText(bytes: Buffer) {
  const result = await pdfParse(bytes);
  const text = result.text.trim();
  if (!text) {
    return "No selectable text was extracted from this PDF. It may be scanned or image-based.";
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
