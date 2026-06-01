import fs from "node:fs";
import path from "node:path";
import type { Book, KnowledgePackage } from "@/lib/types";

const root = process.cwd();
const libraryPath = path.join(root, "storage", "library.json");
const knowledgeRoot = path.join(root, "storage", "knowledge");

export function getBooks(): Book[] {
  const raw = fs.readFileSync(libraryPath, "utf8");
  return JSON.parse(raw) as Book[];
}

export function getBook(slug: string): Book | undefined {
  return getBooks().find((book) => book.slug === slug);
}

export function getKnowledgePackage(slug: string): KnowledgePackage | undefined {
  const filePath = path.join(knowledgeRoot, slug, "package.json");

  if (!fs.existsSync(filePath)) {
    return undefined;
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8")) as KnowledgePackage;
}

export function getAllKnowledgePackages(): KnowledgePackage[] {
  return getBooks()
    .map((book) => getKnowledgePackage(book.slug))
    .filter((book): book is KnowledgePackage => Boolean(book));
}
