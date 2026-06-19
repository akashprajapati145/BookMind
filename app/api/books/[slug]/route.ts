import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import type { Book } from "@/lib/types";

export const runtime = "nodejs";

const root = process.cwd();
const libraryPath = path.join(root, "storage", "library.json");
const booksRoot = path.join(root, "storage", "books");
const knowledgeRoot = path.join(root, "storage", "knowledge");

type RouteProps = { params: Promise<{ slug: string }> };

export async function DELETE(_request: Request, { params }: RouteProps) {
  const { slug } = await params;

  const books = await readLibrary();
  const exists = books.some((b) => b.slug === slug);

  if (!exists) {
    return NextResponse.json({ error: "Book not found." }, { status: 404 });
  }

  // Remove from library.json first so the book is gone from the UI immediately
  await writeLibrary(books.filter((b) => b.slug !== slug));

  // Delete PDF file (best effort — don't fail if already missing)
  await fs.rm(path.join(booksRoot, `${slug}.pdf`), { force: true });

  // Delete the entire knowledge folder (index, chapters, source text, package, chunks)
  await fs.rm(path.join(knowledgeRoot, slug), { recursive: true, force: true });

  return NextResponse.json({ success: true });
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
