import fs from "node:fs";
import path from "node:path";
import { DEFAULT_LANGUAGE, LANGUAGES } from "@/lib/languages";
import type { Book, BookIndex, ChapterDetail, KnowledgePackage, LearningMode } from "@/lib/types";

const root = process.cwd();
const libraryPath = path.join(root, "storage", "library.json");
const knowledgeRoot = path.join(root, "storage", "knowledge");

export function getBooks(): Book[] {
  // A freshly mounted persistent volume (e.g. on first deploy) has no library.json
  // yet — treat that as an empty library instead of crashing every page.
  if (!fs.existsSync(libraryPath)) {
    return [];
  }
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

export function getBookIndex(slug: string): BookIndex | undefined {
  const filePath = path.join(knowledgeRoot, slug, "index.json");
  if (!fs.existsSync(filePath)) return undefined;
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as BookIndex;
}

export function getChapterDetail(slug: string, chapterSlug: string, lang: string = DEFAULT_LANGUAGE): ChapterDetail | undefined {
  const filePath = path.join(knowledgeRoot, slug, "chapters", chapterFileName(chapterSlug, lang));
  if (!fs.existsSync(filePath)) return undefined;

  const raw = JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<string, unknown>;

  // Chapters generated before the multi-paragraph summary change have `summary`
  // saved as a plain string. Wrap it as a single-item array so old cached
  // chapters keep rendering without needing to be regenerated.
  const summary = Array.isArray(raw.summary)
    ? (raw.summary as string[])
    : typeof raw.summary === "string" && raw.summary
      ? [raw.summary]
      : [];

  return {
    title: typeof raw.title === "string" ? raw.title : "",
    summary,
    keyIdeas: Array.isArray(raw.keyIdeas) ? (raw.keyIdeas as string[]) : [],
    examples: Array.isArray(raw.examples) ? (raw.examples as string[]) : [],
    actionItems: Array.isArray(raw.actionItems) ? (raw.actionItems as string[]) : []
  };
}

// English keeps the original unsuffixed filename so existing generated chapters
// keep working without any migration. Other languages get a [code] suffix.
export function chapterFileName(chapterSlug: string, lang: string): string {
  return lang === DEFAULT_LANGUAGE ? `${chapterSlug}.json` : `${chapterSlug}.${lang}.json`;
}

// Checks disk for every configured language, not just English — without this,
// a page reload only ever rehydrates the English tab and any already-generated
// Hindi/German content silently disappears even though it's still saved on disk.
export function getAllChapterDetails(slug: string, chapterSlug: string): Record<string, ChapterDetail> {
  const found: Record<string, ChapterDetail> = {};

  for (const language of LANGUAGES) {
    const detail = getChapterDetail(slug, chapterSlug, language.code);
    if (detail) {
      found[language.code] = detail;
    }
  }

  return found;
}

export function getMode(slug: string, modeSlug: string): LearningMode | undefined {
  const filePath = path.join(knowledgeRoot, slug, "modes", `${modeSlug}.json`);
  if (!fs.existsSync(filePath)) return undefined;
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as LearningMode;
}
