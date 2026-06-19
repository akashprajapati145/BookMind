import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { generateLearningMode } from "@/lib/gemini";
import type { Book, BookIndex, LearningMode } from "@/lib/types";

export const runtime = "nodejs";

const root = process.cwd();
const libraryPath = path.join(root, "storage", "library.json");
const knowledgeRoot = path.join(root, "storage", "knowledge");

type RouteProps = { params: Promise<{ slug: string; mode: string }> };

export async function POST(_request: Request, { params }: RouteProps) {
  const { slug, mode } = await params;

  if (!["10", "30"].includes(mode)) {
    return NextResponse.json({ error: "Invalid learning mode." }, { status: 400 });
  }

  const packageRoot = path.join(knowledgeRoot, slug);
  const modesDir = path.join(packageRoot, "modes");
  const modePath = path.join(modesDir, `${mode}.json`);

  // Idempotency: return the cached mode if it already exists
  const existing = await fs.readFile(modePath, "utf8").catch(() => null);
  if (existing) {
    return NextResponse.json({ mode: JSON.parse(existing) as LearningMode });
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
    const learningMode = await generateLearningMode(book, mode, sourceText, bookIndex);

    await fs.mkdir(modesDir, { recursive: true });
    await fs.writeFile(modePath, JSON.stringify(learningMode, null, 2));

    return NextResponse.json({ mode: learningMode });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Mode generation failed." },
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
