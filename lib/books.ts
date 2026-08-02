import { createClient } from "@/lib/supabase/server";
import { DEFAULT_LANGUAGE, LANGUAGES } from "@/lib/languages";
import type { Book, BookIndex, BookStatus, ChapterDetail, ChapterSection, ChapterType, KnowledgePackage, LearningMode } from "@/lib/types";

// ---------------------------------------------------------------------------
// DB row → Book type
// ---------------------------------------------------------------------------

function rowToBook(row: Record<string, unknown>): Book {
  const meta = (row.metadata ?? {}) as Record<string, unknown>;
  return {
    slug: row.slug as string,
    title: row.title as string,
    author: row.author as string,
    status: row.status as BookStatus,
    progress: row.progress as number,
    addedAt: row.added_at as string,
    category: (meta.category as string) ?? "Uploaded",
    cover: (meta.cover as string) ?? (row.slug as string),
    readingTime: (meta.readingTime as string) ?? "",
    pdfPath: (meta.pdfPath as string) ?? undefined
  };
}

// ---------------------------------------------------------------------------
// Book queries
// ---------------------------------------------------------------------------

export async function getBooks(): Promise<Book[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("books")
    .select("*")
    .eq("user_id", user.id)
    .order("added_at", { ascending: false });
  return (data ?? []).map(rowToBook);
}

export async function getBook(slug: string): Promise<Book | undefined> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return undefined;
  const { data } = await supabase
    .from("books")
    .select("*")
    .eq("user_id", user.id)
    .eq("slug", slug)
    .single();
  return data ? rowToBook(data) : undefined;
}

// ---------------------------------------------------------------------------
// Knowledge queries
// ---------------------------------------------------------------------------

export async function getKnowledgePackage(slug: string): Promise<KnowledgePackage | undefined> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return undefined;
  const { data } = await supabase
    .from("knowledge")
    .select("data")
    .eq("user_id", user.id)
    .eq("slug", slug)
    .eq("key", "package")
    .single();
  return data ? (data.data as KnowledgePackage) : undefined;
}

export async function getAllKnowledgePackages(): Promise<KnowledgePackage[]> {
  const books = await getBooks();
  const packages = await Promise.all(books.map((b) => getKnowledgePackage(b.slug)));
  return packages.filter((p): p is KnowledgePackage => Boolean(p));
}

export async function getBookIndex(slug: string): Promise<BookIndex | undefined> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return undefined;
  const { data } = await supabase
    .from("knowledge")
    .select("data")
    .eq("user_id", user.id)
    .eq("slug", slug)
    .eq("key", "index")
    .single();
  return data ? (data.data as BookIndex) : undefined;
}

export async function getChapterDetail(
  slug: string,
  chapterSlug: string,
  lang: string = DEFAULT_LANGUAGE
): Promise<ChapterDetail | undefined> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return undefined;
  const key = `chapters/${chapterFileName(chapterSlug, lang)}`;
  const { data } = await supabase
    .from("knowledge")
    .select("data")
    .eq("user_id", user.id)
    .eq("slug", slug)
    .eq("key", key)
    .single();
  if (!data) return undefined;
  const raw = data.data as Record<string, unknown>;
  return Array.isArray(raw.sections) ? normalizeStoredChapterDetail(raw) : migrateLegacyChapterDetail(raw);
}

export async function getAllChapterDetails(
  slug: string,
  chapterSlug: string
): Promise<Record<string, ChapterDetail>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return {};
  const { data } = await supabase
    .from("knowledge")
    .select("key, data")
    .eq("user_id", user.id)
    .eq("slug", slug)
    .like("key", `chapters/${chapterSlug}%`);

  const found: Record<string, ChapterDetail> = {};
  for (const row of data ?? []) {
    const filename = (row.key as string).replace("chapters/", "");
    const lang = langFromFileName(filename, chapterSlug);
    if (lang) {
      const raw = row.data as Record<string, unknown>;
      found[lang] = Array.isArray(raw.sections) ? normalizeStoredChapterDetail(raw) : migrateLegacyChapterDetail(raw);
    }
  }
  return found;
}

export async function getMode(slug: string, modeSlug: string): Promise<LearningMode | undefined> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return undefined;
  const { data } = await supabase
    .from("knowledge")
    .select("data")
    .eq("user_id", user.id)
    .eq("slug", slug)
    .eq("key", `modes/${modeSlug}`)
    .single();
  return data ? (data.data as LearningMode) : undefined;
}

// ---------------------------------------------------------------------------
// Filename helpers (unchanged from original)
// ---------------------------------------------------------------------------

// English keeps the original unsuffixed filename so existing generated chapters
// keep working without any migration. Other languages get a [code] suffix.
export function chapterFileName(chapterSlug: string, lang: string): string {
  return lang === DEFAULT_LANGUAGE ? `${chapterSlug}.json` : `${chapterSlug}.${lang}.json`;
}

function langFromFileName(filename: string, chapterSlug: string): string | null {
  if (filename === `${chapterSlug}.json`) return DEFAULT_LANGUAGE;
  const prefix = `${chapterSlug}.`;
  const suffix = ".json";
  if (filename.startsWith(prefix) && filename.endsWith(suffix)) {
    const code = filename.slice(prefix.length, -suffix.length);
    if (LANGUAGES.some((l) => l.code === code)) return code;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Chapter detail normalisation (unchanged from original)
// ---------------------------------------------------------------------------

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
