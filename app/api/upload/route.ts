import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import pdfParse from "pdf-parse";
import { toSlug } from "@/lib/slug";
import type { Book, KnowledgePackage } from "@/lib/types";

export const runtime = "nodejs";

const root = process.cwd();
const storageRoot = path.join(root, "storage");
const booksRoot = path.join(storageRoot, "books");
const knowledgeRoot = path.join(storageRoot, "knowledge");
const libraryPath = path.join(storageRoot, "library.json");

export async function POST(request: Request) {
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

  await fs.mkdir(booksRoot, { recursive: true });
  await fs.mkdir(knowledgeRoot, { recursive: true });

  const fallbackTitle = file.name.replace(/\.pdf$/i, "").replace(/[-_]+/g, " ");
  const title = titleValue.trim() || fallbackTitle || "Untitled Book";
  const baseSlug = toSlug(title) || "uploaded-book";
  const existingBooks = await readLibrary();
  const slug = uniqueSlug(baseSlug, existingBooks);
  const pdfPath = path.join(booksRoot, `${slug}.pdf`);

  const bytes = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(pdfPath, bytes);
  const extractedText = await extractPdfText(bytes);
  const wordCount = countWords(extractedText);

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
    pdfPath: `storage/books/${slug}.pdf`
  };

  const packageRoot = path.join(knowledgeRoot, slug);
  await fs.mkdir(packageRoot, { recursive: true });
  await fs.writeFile(path.join(packageRoot, "source.txt"), extractedText);
  await fs.writeFile(
    path.join(packageRoot, "extraction.json"),
    JSON.stringify(
      {
        fileName: file.name,
        bytes: bytes.length,
        wordCount,
        extractedAt: new Date().toISOString()
      },
      null,
      2
    )
  );
  await fs.writeFile(path.join(packageRoot, "package.json"), JSON.stringify(createPlaceholderKnowledge(book, wordCount), null, 2));
  await fs.writeFile(libraryPath, JSON.stringify([book, ...existingBooks], null, 2));

  return NextResponse.json({ book });
}

// Avoids depending on the global `File` constructor — it's not consistently
// available as a bare global across Node versions/runtimes (it crashed with
// "ReferenceError: File is not defined" on Railway's Node build despite working
// locally on Windows). Checking the shape we actually use is environment-proof.
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
  if (wordCount <= 0) {
    return "Text extracted";
  }

  const minutes = Math.max(1, Math.ceil(wordCount / 225));

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

async function readLibrary(): Promise<Book[]> {
  try {
    return JSON.parse(await fs.readFile(libraryPath, "utf8")) as Book[];
  } catch {
    return [];
  }
}

function uniqueSlug(baseSlug: string, books: Book[]) {
  const used = new Set(books.map((book) => book.slug));

  if (!used.has(baseSlug)) {
    return baseSlug;
  }

  let index = 2;
  while (used.has(`${baseSlug}-${index}`)) {
    index += 1;
  }

  return `${baseSlug}-${index}`;
}

function createPlaceholderKnowledge(book: Book, wordCount: number): KnowledgePackage {
  return {
    book,
    thesis: "This PDF has been uploaded and its text has been extracted locally. Google Gemini generation is the next milestone.",
    framework: "Extracted source text is stored permanently and will be transformed into learning modes, concepts, examples, chapters, and actions.",
    overview: [
      "The source PDF is stored locally.",
      `BookMind extracted approximately ${wordCount.toLocaleString()} words from the PDF.`,
      "The next step is Google Gemini generation for learning modes, concepts, examples, chapters, and actions."
    ],
    learningModes: [
      {
        slug: "1",
        label: "Flash",
        title: "Learn in 1 Minute",
        duration: "1 min",
        summary: "Pending knowledge generation.",
        sections: [{ title: "Extracted", items: ["Upload complete.", "Source text extracted.", "Google Gemini generation is next."] }]
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
        sections: [{ title: "Extracted", items: ["Full knowledge package generation is queued for the Google Gemini milestone."] }]
      }
    ],
    journey: [{ title: "Extracted", description: "The PDF has been saved and converted into local source text." }],
    contents: [{ title: "Pending Generation", chapters: ["Chapter hierarchy will be generated from extracted source text."] }],
    chapters: [],
    concepts: [],
    examples: [],
    actions: {
      tomorrow: ["Review extracted source text."],
      thisWeek: ["Generate the first Google Gemini knowledge package."],
      thisMonth: ["Refine examples and chapter navigation."]
    }
  };
}
