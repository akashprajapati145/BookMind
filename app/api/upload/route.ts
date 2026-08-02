import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import pdfParse from "pdf-parse";
import { createClient } from "@/lib/supabase/server";
import { toSlug } from "@/lib/slug";
import type { Book, KnowledgePackage } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const titleValue = String(formData.get("title") || "");
  const authorValue = String(formData.get("author") || "Unknown Author");

  if (!isUploadedFile(file)) {
    return NextResponse.json({ error: "A PDF file is required." }, { status: 400 });
  }

  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "Only PDF uploads are supported in the MVP." }, { status: 400 });
  }

  const fallbackTitle = file.name.replace(/\.pdf$/i, "").replace(/[-_]+/g, " ");
  const title = titleValue.trim() || fallbackTitle || "Untitled Book";
  const baseSlug = toSlug(title) || "uploaded-book";

  // Check for slug uniqueness against this user's existing books
  const { data: existingBooks } = await supabase
    .from("books")
    .select("slug")
    .eq("user_id", user.id);
  const usedSlugs = new Set((existingBooks ?? []).map((b: { slug: string }) => b.slug));
  const slug = uniqueSlug(baseSlug, usedSlugs);

  const bytes = Buffer.from(await file.arrayBuffer());
  const extractedText = await extractPdfText(bytes);
  const wordCount = countWords(extractedText);

  // Upload PDF to Supabase Storage
  const pdfStoragePath = `${user.id}/books/${slug}.pdf`;
  const { error: pdfUploadError } = await supabase.storage
    .from("bookmind")
    .upload(pdfStoragePath, bytes, { contentType: "application/pdf", upsert: true });

  if (pdfUploadError) {
    return NextResponse.json({ error: "Failed to upload PDF." }, { status: 500 });
  }

  // Upload extracted source text to Storage
  const sourceStoragePath = `${user.id}/source/${slug}.txt`;
  await supabase.storage
    .from("bookmind")
    .upload(sourceStoragePath, extractedText, { contentType: "text/plain", upsert: true });

  const book: Book = {
    slug,
    title,
    author: authorValue.trim() || "Unknown Author",
    category: "Uploaded",
    cover: slug,
    readingTime: estimateReadingTime(wordCount),
    status: "extracted",
    progress: 0,
    addedAt: new Date().toISOString(),
    pdfPath: pdfStoragePath
  };

  // Insert book metadata into the database
  const { error: dbError } = await supabase.from("books").insert({
    user_id: user.id,
    slug,
    title,
    author: book.author,
    status: "extracted",
    progress: 0,
    added_at: book.addedAt,
    metadata: {
      category: "Uploaded",
      cover: slug,
      readingTime: book.readingTime,
      pdfPath: pdfStoragePath,
      wordCount
    }
  });

  if (dbError) {
    return NextResponse.json({ error: "Failed to save book." }, { status: 500 });
  }

  // Insert placeholder knowledge package
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

function isUploadedFile(value: FormDataEntryValue | null): value is File {
  return Boolean(
    value &&
    typeof value === "object" &&
    "arrayBuffer" in value &&
    typeof (value as { arrayBuffer?: unknown }).arrayBuffer === "function" &&
    "name" in value &&
    "type" in value
  );
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

function uniqueSlug(baseSlug: string, used: Set<string>) {
  if (!used.has(baseSlug)) return baseSlug;
  let index = 2;
  while (used.has(`${baseSlug}-${index}`)) index += 1;
  return `${baseSlug}-${index}`;
}

function createPlaceholderKnowledge(book: Book, wordCount: number): KnowledgePackage {
  return {
    book,
    thesis: "This PDF has been uploaded and its text has been extracted. Knowledge generation is the next step.",
    framework: "Extracted source text is stored and will be transformed into learning modes, concepts, examples, chapters, and actions.",
    overview: [
      "The source PDF is stored in Supabase Storage.",
      `BookMind extracted approximately ${wordCount.toLocaleString()} words from the PDF.`,
      "The next step is AI knowledge generation for learning modes, concepts, examples, chapters, and actions."
    ],
    learningModes: [
      {
        slug: "1",
        label: "Flash",
        title: "Learn in 1 Minute",
        duration: "1 min",
        summary: "Pending knowledge generation.",
        sections: [{ title: "Extracted", items: ["Upload complete.", "Source text extracted.", "Knowledge generation is next."] }]
      },
      {
        slug: "10",
        label: "Core",
        title: "Learn in 10 Minutes",
        duration: "10 min",
        summary: "Pending knowledge generation.",
        sections: [{ title: "Extracted", items: ["Core framework will be generated from the extracted text."] }]
      },
      {
        slug: "30",
        label: "Deep",
        title: "Learn in 30 Minutes",
        duration: "30 min",
        summary: "Pending knowledge generation.",
        sections: [{ title: "Extracted", items: ["Detailed understanding will be generated from the extracted text."] }]
      },
      {
        slug: "full",
        label: "Library",
        title: "Full Depth",
        duration: "Full",
        summary: "Pending knowledge generation.",
        sections: [{ title: "Extracted", items: ["Full knowledge package generation is queued."] }]
      }
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
