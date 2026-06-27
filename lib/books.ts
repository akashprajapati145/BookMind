import fs from "node:fs";
import path from "node:path";
import { DEFAULT_LANGUAGE, LANGUAGES } from "@/lib/languages";
import type { Book, BookIndex, ChapterDetail, ChapterSection, ChapterType, KnowledgePackage, LearningMode } from "@/lib/types";

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

  // New adaptive-structure schema already has a `sections` array.
  if (Array.isArray(raw.sections)) {
    return normalizeStoredChapterDetail(raw);
  }

  // Legacy schema (keyIdeas/examples/actionItems as flat arrays, pre-adaptive
  // structure) — convert so old cached chapters degrade gracefully in the new
  // UI instead of crashing, rather than requiring every chapter regenerated.
  return migrateLegacyChapterDetail(raw);
}

function toSummaryParagraphs(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

function normalizeStoredChapterDetail(raw: Record<string, unknown>): ChapterDetail {
  const allowedTypes: ChapterType[] = ["enumerated", "argument", "narrative", "instructional", "mixed"];
  const chapterType = allowedTypes.includes(raw.chapterType as ChapterType) ? (raw.chapterType as ChapterType) : "mixed";

  const detail: ChapterDetail = {
    title: typeof raw.title === "string" ? raw.title : "",
    chapterType,
    summary: toSummaryParagraphs(raw.summary),
    sections: Array.isArray(raw.sections) ? (raw.sections as ChapterSection[]) : []
  };

  if (raw.standoutExample && typeof raw.standoutExample === "object") {
    detail.standoutExample = raw.standoutExample as { label: string; story: string };
  }

  if (Array.isArray(raw.actionItems) && raw.actionItems.length > 0) {
    detail.actionItems = raw.actionItems as string[];
  }

  return detail;
}

function migrateLegacyChapterDetail(raw: Record<string, unknown>): ChapterDetail {
  const keyIdeas = Array.isArray(raw.keyIdeas) ? (raw.keyIdeas as string[]) : [];
  const items = keyIdeas.map((idea) => {
    const colonIndex = idea.indexOf(":");
    return colonIndex > 0 && colonIndex < 80
      ? { label: idea.slice(0, colonIndex).trim(), explanation: idea.slice(colonIndex + 1).trim() }
      : { label: "", explanation: idea };
  });

  const detail: ChapterDetail = {
    title: typeof raw.title === "string" ? raw.title : "",
    chapterType: "mixed",
    summary: toSummaryParagraphs(raw.summary),
    sections: items.length > 0 ? [{ kind: "list", title: "Key Ideas", items }] : []
  };

  const examples = Array.isArray(raw.examples) ? (raw.examples as string[]) : [];
  if (examples.length > 0) {
    detail.standoutExample = { label: "Example", story: examples[0] };
  }

  const actionItems = Array.isArray(raw.actionItems) ? (raw.actionItems as string[]) : [];
  if (actionItems.length > 0) {
    detail.actionItems = actionItems;
  }

  return detail;
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
