import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { toSlug } from "@/lib/slug";
import type { Book, KnowledgePackage } from "@/lib/types";

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

  if (!(file instanceof File)) {
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

  const book: Book = {
    slug,
    title,
    author: authorValue.trim() || "Unknown Author",
    category: "Uploaded",
    cover: slug,
    readingTime: "Processing",
    status: "processing",
    progress: 0,
    addedAt: new Date().toISOString(),
    pdfPath: `storage/books/${slug}.pdf`
  };

  const packageRoot = path.join(knowledgeRoot, slug);
  await fs.mkdir(packageRoot, { recursive: true });
  await fs.writeFile(path.join(packageRoot, "package.json"), JSON.stringify(createPlaceholderKnowledge(book), null, 2));
  await fs.writeFile(libraryPath, JSON.stringify([book, ...existingBooks], null, 2));

  return NextResponse.json({ book });
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

function createPlaceholderKnowledge(book: Book): KnowledgePackage {
  return {
    book,
    thesis: "This PDF has been uploaded and is ready for extraction in the next MVP milestone.",
    framework: "PDF text extraction and AI knowledge generation will replace this placeholder package.",
    overview: [
      "The source PDF is stored locally.",
      "The book now appears in the library.",
      "The next step is extracting text, then generating learning modes, concepts, examples, chapters, and actions."
    ],
    learningModes: [
      {
        slug: "1",
        label: "Flash",
        title: "Learn in 1 Minute",
        duration: "1 min",
        summary: "Pending knowledge generation.",
        sections: [{ title: "Processing", items: ["Upload complete.", "Text extraction is the next milestone."] }]
      },
      {
        slug: "10",
        label: "Core",
        title: "Learn in 10 Minutes",
        duration: "10 min",
        summary: "Pending knowledge generation.",
        sections: [{ title: "Processing", items: ["Core framework will be generated from the PDF."] }]
      },
      {
        slug: "30",
        label: "Deep",
        title: "Learn in 30 Minutes",
        duration: "30 min",
        summary: "Pending knowledge generation.",
        sections: [{ title: "Processing", items: ["Detailed understanding will be generated from the PDF."] }]
      },
      {
        slug: "full",
        label: "Library",
        title: "Full Depth",
        duration: "Full",
        summary: "Pending knowledge generation.",
        sections: [{ title: "Processing", items: ["Full knowledge package generation is queued for a later milestone."] }]
      }
    ],
    journey: [{ title: "Uploaded", description: "The PDF has been saved to local storage." }],
    contents: [{ title: "Pending Extraction", chapters: ["PDF text extraction has not run yet."] }],
    chapters: [],
    concepts: [],
    examples: [],
    actions: {
      tomorrow: ["Run PDF text extraction."],
      thisWeek: ["Generate the first knowledge package."],
      thisMonth: ["Refine examples and chapter navigation."]
    }
  };
}
