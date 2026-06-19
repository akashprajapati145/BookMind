import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { chapterFileName } from "@/lib/books";
import { generateChapterDetail } from "@/lib/gemini";
import { DEFAULT_LANGUAGE, LANGUAGES } from "@/lib/languages";
import { toSlug } from "@/lib/slug";
import type { Book, BookIndex, ChapterDetail } from "@/lib/types";

export const runtime = "nodejs";

const root = process.cwd();
const libraryPath = path.join(root, "storage", "library.json");
const knowledgeRoot = path.join(root, "storage", "knowledge");

type RouteProps = { params: Promise<{ slug: string }> };

export async function POST(request: Request, { params }: RouteProps) {
  const { slug } = await params;

  const body = await request.json().catch(() => null) as { title?: string; lang?: string } | null;
  const chapterTitle = body?.title?.trim() ?? "";
  const lang = LANGUAGES.some((l) => l.code === body?.lang) ? body!.lang! : DEFAULT_LANGUAGE;

  if (!chapterTitle) {
    return NextResponse.json({ error: "Chapter title is required." }, { status: 400 });
  }

  const chapterSlug = toSlug(chapterTitle);
  const packageRoot = path.join(knowledgeRoot, slug);
  const chaptersDir = path.join(packageRoot, "chapters");
  const chapterPath = path.join(chaptersDir, chapterFileName(chapterSlug, lang));

  // Idempotency: return the cached file if it already exists
  const existing = await fs.readFile(chapterPath, "utf8").catch(() => null);
  if (existing) {
    return NextResponse.json({ chapter: JSON.parse(existing) as ChapterDetail });
  }

  const books = await readLibrary();
  const book = books.find((b) => b.slug === slug);

  if (!book) {
    return NextResponse.json({ error: "Book not found." }, { status: 404 });
  }

  const indexPath = path.join(packageRoot, "index.json");
  const indexRaw = await fs.readFile(indexPath, "utf8").catch(() => null);

  if (!indexRaw) {
    return NextResponse.json(
      { error: "Book index not found. Generate the index first." },
      { status: 400 }
    );
  }

  const bookIndex = JSON.parse(indexRaw) as BookIndex;
  const sourcePath = path.join(packageRoot, "source.txt");
  const sourceText = await fs.readFile(sourcePath, "utf8").catch(() => "");

  if (!sourceText.trim()) {
    return NextResponse.json(
      { error: "No source text found. Re-upload the PDF." },
      { status: 400 }
    );
  }

  try {
    const detail = await generateChapterDetail(book, chapterTitle, sourceText, bookIndex, lang);

    await fs.mkdir(chaptersDir, { recursive: true });
    await fs.writeFile(chapterPath, JSON.stringify(detail, null, 2));

    return NextResponse.json({ chapter: detail });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Chapter generation failed." },
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
