import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { generateBookIndex } from "@/lib/gemini";
import type { Book, BookIndex } from "@/lib/types";

export const runtime = "nodejs";

const root = process.cwd();
const libraryPath = path.join(root, "storage", "library.json");
const knowledgeRoot = path.join(root, "storage", "knowledge");

type RouteProps = { params: Promise<{ slug: string }> };

export async function POST(_request: Request, { params }: RouteProps) {
  const { slug } = await params;

  const packageRoot = path.join(knowledgeRoot, slug);
  const indexPath = path.join(packageRoot, "index.json");

  // Idempotency: return cached index if it already exists
  const existing = await fs.readFile(indexPath, "utf8").catch(() => null);
  if (existing) {
    return NextResponse.json({ index: JSON.parse(existing) as BookIndex });
  }

  const books = await readLibrary();
  const book = books.find((b) => b.slug === slug);

  if (!book) {
    return NextResponse.json({ error: "Book not found." }, { status: 404 });
  }

  const sourcePath = path.join(packageRoot, "source.txt");
  const sourceText = await fs.readFile(sourcePath, "utf8").catch(() => "");

  if (!sourceText.trim()) {
    return NextResponse.json(
      { error: "No extracted source text found. Re-upload the PDF." },
      { status: 400 }
    );
  }

  // Mark as processing so the UI can show the right state
  await writeLibrary(books.map((b) => (b.slug === slug ? { ...b, status: "processing" } : b)));

  try {
    const bookIndex = await generateBookIndex(book, sourceText);

    await fs.writeFile(indexPath, JSON.stringify(bookIndex, null, 2));
    await writeLibrary(
      books.map((b) => (b.slug === slug ? { ...bookIndex.book } : b))
    );

    return NextResponse.json({ index: bookIndex });
  } catch (error) {
    // Roll back status to extracted so the user can retry
    await writeLibrary(books.map((b) => (b.slug === slug ? { ...b, status: "extracted" } : b)));
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Index generation failed." },
      { status: 500 }
    );
  }
}

async function readLibrary(): Promise<Book[]> {
  try {
    return JSON.parse(await fs.readFile(libraryPath, "utf8")) as Book[];
  } catch {
    return [];
  }
}

async function writeLibrary(books: Book[]) {
  await fs.writeFile(libraryPath, JSON.stringify(books, null, 2));
}
