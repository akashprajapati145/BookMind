import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { generateKnowledgePackage } from "@/lib/gemini";
import type { Book } from "@/lib/types";

export const runtime = "nodejs";

const root = process.cwd();
const libraryPath = path.join(root, "storage", "library.json");
const knowledgeRoot = path.join(root, "storage", "knowledge");

type GenerateRouteProps = {
  params: Promise<{ slug: string }>;
};

export async function POST(_request: Request, { params }: GenerateRouteProps) {
  const { slug } = await params;
  const books = await readLibrary();
  const book = books.find((item) => item.slug === slug);

  if (!book) {
    return NextResponse.json({ error: "Book not found." }, { status: 404 });
  }

  const packageRoot = path.join(knowledgeRoot, slug);
  const sourcePath = path.join(packageRoot, "source.txt");
  const sourceText = await fs.readFile(sourcePath, "utf8").catch(() => "");

  if (!sourceText.trim()) {
    return NextResponse.json({ error: "No extracted source text found. Upload and extract the PDF first." }, { status: 400 });
  }

  const generatingBook: Book = { ...book, status: "processing" };
  await writeLibrary(books.map((item) => (item.slug === slug ? generatingBook : item)));

  try {
    const chunksRoot = path.join(packageRoot, "chunks");
    await fs.mkdir(chunksRoot, { recursive: true });

    const knowledgePackage = await generateKnowledgePackage(generatingBook, sourceText, {
      onChunk: async (chunk) => {
        const fileName = `chunk-${String(chunk.chunkIndex).padStart(3, "0")}.json`;
        await fs.writeFile(path.join(chunksRoot, fileName), JSON.stringify(chunk, null, 2));
      }
    });
    const readyBook = knowledgePackage.book;

    await fs.writeFile(path.join(packageRoot, "package.json"), JSON.stringify(knowledgePackage, null, 2));
    await fs.writeFile(
      path.join(packageRoot, "generation.json"),
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          provider: "google-gemini",
          strategy: "chunked"
        },
        null,
        2
      )
    );
    await writeLibrary(books.map((item) => (item.slug === slug ? readyBook : item)));

    return NextResponse.json({ book: readyBook });
  } catch (error) {
    const failedBook: Book = { ...book, status: "extracted" };
    await writeLibrary(books.map((item) => (item.slug === slug ? failedBook : item)));

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Knowledge generation failed." },
      { status: 500 }
    );
  }
}

async function readLibrary(): Promise<Book[]> {
  return JSON.parse(await fs.readFile(libraryPath, "utf8")) as Book[];
}

async function writeLibrary(books: Book[]) {
  await fs.writeFile(libraryPath, JSON.stringify(books, null, 2));
}
