import path from "node:path";
import { isolateChapterText } from "@/lib/chapter-isolation";
import { DEFAULT_LANGUAGE, LANGUAGES } from "@/lib/languages";
import { loadOutline } from "@/lib/pdf-outline";
import type { ActionPlan, Book, BookIndex, ChapterDetail, ChapterKnowledge, ChapterSection, ChapterType, Concept, ContentPart, Example, JourneyNode, KnowledgePackage, LearningMode } from "@/lib/types";

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message?: string;
  };
};

type GeneratedKnowledge = Omit<KnowledgePackage, "book">;
type ChunkKnowledge = {
  chunkIndex: number;
  title: string;
  summary: string[];
  concepts: Concept[];
  examples: Example[];
  chapters: ChapterKnowledge[];
  actions: string[];
};
type GenerationOptions = {
  onChunk?: (chunk: ChunkKnowledge) => Promise<void>;
};

const model = "gemini-2.5-flash";
const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
const chunkSize = 120000;

// Free-tier Gemini keys are capped at 20 requests/min and 250k input tokens/min
// EACH. Supporting multiple keys (ideally from separate Google accounts/projects)
// and rotating which one starts each call spreads load evenly across them instead
// of hammering key[0] until it alone hits the cap.
let keyRotationIndex = 0;

function getApiKeys(): string[] {
  return [
    process.env.GOOGLE_API_KEY,
    process.env.GOOGLE_API_KEY_FALLBACK,
    process.env.GOOGLE_API_KEY_FALLBACK_2,
    process.env.GOOGLE_API_KEY_FALLBACK_3
  ].filter(Boolean) as string[];
}

export async function generateKnowledgePackage(
  book: Book,
  sourceText: string,
  options: GenerationOptions = {}
): Promise<KnowledgePackage> {

  const approxPages = Math.ceil(sourceText.length / 3000);

  if (approxPages <= 250) {
    console.log(
      `[BookMind] Direct generation mode (${approxPages} pages)`
    );

    const generated = await callGemini(
      buildSingleBookPrompt(sourceText)
    );

    return normalizeKnowledgePackage(book, generated);
  }

  const chunks = splitIntoChunks(sourceText, chunkSize);

  const chunkKnowledge: ChunkKnowledge[] = [];

  for (const [index, chunk] of chunks.entries()) {

    const generatedChunk = normalizeChunkKnowledge(
      await callGemini(
        buildChunkPrompt(
          chunk,
          index + 1,
          chunks.length
        )
      ),
      index + 1
    );

    chunkKnowledge.push(generatedChunk);

    await options.onChunk?.(generatedChunk);
  }

  const generated = await callGemini(
    buildMergePrompt(chunkKnowledge)
  );

  return normalizeKnowledgePackage(book, generated);
}

async function callGemini<T = GeneratedKnowledge>(prompt: string): Promise<T> {
  const keys = getApiKeys();

  if (keys.length === 0) {
    throw new Error("GOOGLE_API_KEY is missing.");
  }

  // Rotate the starting key on every call (round-robin), then fall through the
  // rest in order if that one fails — keeps both load-spreading and resilience.
  const startIndex = keyRotationIndex % keys.length;
  keyRotationIndex += 1;
  const orderedKeys = [...keys.slice(startIndex), ...keys.slice(0, startIndex)];

  const body = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: prompt
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.25,
      responseMimeType: "application/json",
      maxOutputTokens: 32768
    }
  };

  const errors: string[] = [];

  for (const key of orderedKeys) {
    const response = await fetch(`${endpoint}?key=${key}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const payload = (await response.json().catch(() => null)) as GeminiResponse | null;

    if (!response.ok) {
      errors.push(payload?.error?.message || `Gemini request failed with status ${response.status}`);
      continue;
    }

    const text = payload?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim();

    if (!text) {
      errors.push("Gemini returned an empty response.");
      continue;
    }

    return parseGeminiJson<T>(text);
  }

  throw new Error(errors.join(" | ") || "Gemini generation failed.");
}

function buildChunkPrompt(sourceText: string, chunkIndex: number, totalChunks: number) {
  return `You are BookMind, a book learning system.

Analyze chunk ${chunkIndex} of ${totalChunks} from an extracted book.

Return valid JSON only. Do not include markdown fences, comments, or prose outside JSON.

Required JSON shape:
{
  "chunkIndex": ${chunkIndex},
  "title": "short label for this chunk",
  "summary": ["important points from this chunk"],
  "concepts": [{"title": "concept", "description": "...", "whyItMatters": "..."}],
  "examples": [{"concept": "...", "authorExample": "...", "story": "...", "modernExample": "...", "personalApplication": "..."}],
  "chapters": [{"title": "chapter or section title", "summary": "...", "keyIdeas": ["..."], "examples": ["..."], "actionItems": ["..."]}],
  "actions": ["practical actions from this chunk"]
}

Limits:
- summary: max 8 items
- concepts: max 8 items
- examples: max 8 items
- chapters: max 8 items
- actions: max 8 items
- Keep every string under 450 characters.

Preserve examples, stories, chapter/section transitions, frameworks, and concrete details. Be concise but do not flatten useful examples.

Extracted book chunk:
${sourceText}`;
}


function buildSingleBookPrompt(sourceText: string) {
  return `You are BookMind.

Analyze the uploaded book.

Return valid JSON only.

Required JSON structure:

{
  "thesis": "",
  "framework": "",
  "overview": [],
  "learningModes": [
    {
      "slug": "1",
      "label": "Flash",
      "title": "Learn in 1 Minute",
      "duration": "1 min",
      "summary": "",
      "sections": []
    },
    {
      "slug": "10",
      "label": "Core",
      "title": "Learn in 10 Minutes",
      "duration": "10 min",
      "summary": "",
      "sections": []
    },
    {
      "slug": "30",
      "label": "Deep",
      "title": "Learn in 30 Minutes",
      "duration": "30 min",
      "summary": "",
      "sections": []
    },
    {
      "slug": "full",
      "label": "Library",
      "title": "Full Depth",
      "duration": "Full",
      "summary": "",
      "sections": []
    }
  ],
  "journey": [],
  "contents": [],
  "chapters": [],
  "concepts": [],
  "examples": [],
  "actions": {
    "tomorrow": [],
    "thisWeek": [],
    "thisMonth": []
  }
}

Preserve:
- concepts
- examples
- stories
- frameworks
- chapter relationships

BOOK:

${sourceText}`;
}

function buildMergePrompt(chunks: ChunkKnowledge[]) {
  return `You are BookMind, a book learning system.

Merge the provided chunk-level analyses into one coherent BookMind knowledge package.

Return valid JSON only. Do not include markdown fences, comments, or prose outside JSON.

The JSON object must have exactly these top-level keys:
thesis, framework, overview, learningModes, journey, contents, chapters, concepts, examples, actions

Required shape:
{
  "thesis": "one clear sentence",
  "framework": "one paragraph",
  "overview": ["3-5 concise paragraphs"],
  "learningModes": [
    {
      "slug": "1",
      "label": "Flash",
      "title": "Learn in 1 Minute",
      "duration": "1 min",
      "summary": "short summary",
      "sections": [{"title": "Book Thesis", "items": ["..."]}]
    },
    {
      "slug": "10",
      "label": "Core",
      "title": "Learn in 10 Minutes",
      "duration": "10 min",
      "summary": "short summary",
      "sections": [{"title": "Core Framework", "items": ["..."]}]
    },
    {
      "slug": "30",
      "label": "Deep",
      "title": "Learn in 30 Minutes",
      "duration": "30 min",
      "summary": "short summary",
      "sections": [{"title": "Detailed Understanding", "items": ["..."]}]
    },
    {
      "slug": "full",
      "label": "Library",
      "title": "Full Depth",
      "duration": "Full",
      "summary": "short summary",
      "sections": [{"title": "Includes", "items": ["..."]}]
    }
  ],
  "journey": [{"title": "idea node", "description": "how this idea progresses"}],
  "contents": [{"title": "Part or section title", "chapters": ["chapter title"]}],
  "chapters": [{"title": "chapter title", "summary": "...", "keyIdeas": ["..."], "examples": ["..."], "actionItems": ["..."]}],
  "concepts": [{"title": "concept", "description": "...", "whyItMatters": "..."}],
  "examples": [{"concept": "...", "authorExample": "...", "story": "...", "modernExample": "...", "personalApplication": "..."}],
  "actions": {"tomorrow": ["..."], "thisWeek": ["..."], "thisMonth": ["..."]}
}

Limits:
- overview: 3-5 items
- learningModes: exactly 4 modes
- each learning mode: max 3 sections, max 5 items per section
- journey: max 8 nodes
- contents: max 10 parts, max 8 chapters per part
- chapters: max 12 chapters
- concepts: max 12 concepts
- examples: max 12 examples
- each actions array: max 8 items
- Keep every string under 600 characters.

Preserve examples, stories, frameworks, chapter relationships, and practical actions across all chunks. Deduplicate repeated ideas. Keep the original idea progression as much as possible.

Chunk analyses:
${JSON.stringify(chunks)}`;
}

function stripJsonFences(text: string) {
  return text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

function parseGeminiJson<T>(text: string): T {
  const cleaned = extractJsonObject(stripJsonFences(text));

  try {
    return JSON.parse(cleaned) as T;
  } catch (error) {
    const repaired = repairCommonJsonIssues(cleaned);

    try {
      return JSON.parse(repaired) as T;
    } catch {
      throw new Error(error instanceof Error ? `Gemini returned invalid JSON: ${error.message}` : "Gemini returned invalid JSON.");
    }
  }
}

function extractJsonObject(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return text;
  }

  return text.slice(start, end + 1);
}

function repairCommonJsonIssues(text: string) {
  let repaired = text
    .replace(/,\s*([}\]])/g, "$1")
    .replace(/[\u0000-\u001F]+/g, " ");

  const quoteCount = (repaired.match(/"/g) || []).length;
  if (quoteCount % 2 === 1) {
    repaired += '"';
  }

  const openBraces = (repaired.match(/{/g) || []).length;
  const closeBraces = (repaired.match(/}/g) || []).length;
  const openBrackets = (repaired.match(/\[/g) || []).length;
  const closeBrackets = (repaired.match(/]/g) || []).length;

  repaired += "]".repeat(Math.max(0, openBrackets - closeBrackets));
  repaired += "}".repeat(Math.max(0, openBraces - closeBraces));

  return repaired;
}

function normalizeKnowledgePackage(book: Book, generated: GeneratedKnowledge): KnowledgePackage {
  return {
    book: { ...book, status: "ready", progress: Math.max(book.progress, 1) },
    thesis: stringOr(generated.thesis, "Knowledge package generated from the uploaded book."),
    framework: stringOr(generated.framework, "The core framework was generated from the extracted source text."),
    overview: stringArray(generated.overview),
    learningModes: normalizeModes(generated.learningModes),
    journey: normalizeJourney(generated.journey),
    contents: normalizeContents(generated.contents),
    chapters: normalizeChapters(generated.chapters),
    concepts: normalizeConcepts(generated.concepts),
    examples: normalizeExamples(generated.examples),
    actions: normalizeActions(generated.actions)
  };
}

function normalizeChunkKnowledge(value: unknown, fallbackIndex: number): ChunkKnowledge {
  const item = isRecord(value) ? value : {};

  return {
    chunkIndex: typeof item.chunkIndex === "number" ? item.chunkIndex : fallbackIndex,
    title: stringOr(item.title, `Chunk ${fallbackIndex}`),
    summary: stringArray(item.summary),
    concepts: normalizeConcepts(item.concepts),
    examples: normalizeExamples(item.examples),
    chapters: normalizeChapters(item.chapters),
    actions: stringArray(item.actions)
  };
}

function splitIntoChunks(text: string, size: number) {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  const chunks: string[] = [];
  let start = 0;

  while (start < normalized.length) {
    let end = Math.min(start + size, normalized.length);

    if (end < normalized.length) {
      const paragraphBreak = normalized.lastIndexOf("\n\n", end);
      const sentenceBreak = normalized.lastIndexOf(". ", end);
      const breakPoint = Math.max(paragraphBreak, sentenceBreak);

      if (breakPoint > start + size * 0.55) {
        end = breakPoint + (breakPoint === sentenceBreak ? 1 : 0);
      }
    }

    chunks.push(normalized.slice(start, end).trim());
    start = end;
  }

  return chunks.filter(Boolean);
}

function normalizeModes(value: unknown): LearningMode[] {
  const items = Array.isArray(value) ? value : [];
  const defaults: LearningMode[] = [
    { slug: "1", label: "Flash", title: "Learn in 1 Minute", duration: "1 min", summary: "Fast understanding.", sections: [] },
    { slug: "10", label: "Core", title: "Learn in 10 Minutes", duration: "10 min", summary: "Core framework.", sections: [] },
    { slug: "30", label: "Deep", title: "Learn in 30 Minutes", duration: "30 min", summary: "Detailed understanding.", sections: [] },
    { slug: "full", label: "Library", title: "Full Depth", duration: "Full", summary: "Full knowledge package.", sections: [] }
  ];

  return defaults.map((fallback) => {
    const item = items.find((entry) => isRecord(entry) && entry.slug === fallback.slug);
    if (!isRecord(item)) return fallback;

    return {
      ...fallback,
      label: stringOr(item.label, fallback.label),
      title: stringOr(item.title, fallback.title),
      duration: stringOr(item.duration, fallback.duration),
      summary: stringOr(item.summary, fallback.summary),
      sections: Array.isArray(item.sections)
        ? item.sections.filter(isRecord).map((section) => ({
            title: stringOr(section.title, "Section"),
            items: stringArray(section.items)
          }))
        : fallback.sections
    };
  });
}

function normalizeJourney(value: unknown): JourneyNode[] {
  return arrayOfRecords(value).map((item) => ({
    title: stringOr(item.title, "Idea"),
    description: stringOr(item.description, "")
  }));
}

function normalizeContents(value: unknown): ContentPart[] {
  return arrayOfRecords(value).map((item) => ({
    title: stringOr(item.title, "Contents"),
    chapters: stringArray(item.chapters)
  }));
}

function normalizeChapters(value: unknown): ChapterKnowledge[] {
  return arrayOfRecords(value).map((item) => ({
    title: stringOr(item.title, "Chapter"),
    summary: stringOr(item.summary, ""),
    keyIdeas: stringArray(item.keyIdeas),
    examples: stringArray(item.examples),
    actionItems: stringArray(item.actionItems)
  }));
}

function normalizeConcepts(value: unknown): Concept[] {
  return arrayOfRecords(value).map((item) => ({
    title: stringOr(item.title, "Concept"),
    description: stringOr(item.description, ""),
    whyItMatters: stringOr(item.whyItMatters, "")
  }));
}

function normalizeExamples(value: unknown): Example[] {
  return arrayOfRecords(value).map((item) => ({
    concept: stringOr(item.concept, "Example"),
    authorExample: stringOr(item.authorExample, ""),
    story: stringOr(item.story, ""),
    modernExample: stringOr(item.modernExample, ""),
    personalApplication: stringOr(item.personalApplication, "")
  }));
}

function normalizeActions(value: unknown): ActionPlan {
  const item = isRecord(value) ? value : {};
  return {
    tomorrow: stringArray(item.tomorrow),
    thisWeek: stringArray(item.thisWeek),
    thisMonth: stringArray(item.thisMonth)
  };
}

function arrayOfRecords(value: unknown) {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function stringOr(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

// ─── Staged generation: index ────────────────────────────────────────────────

export async function generateBookIndex(book: Book, sourceText: string): Promise<BookIndex> {
  const raw = await callGemini<unknown>(buildIndexPrompt(sourceText));
  return normalizeBookIndex(book, raw);
}

function buildIndexPrompt(sourceText: string): string {
  return `You are BookMind, a book learning system.

Generate a fast structural index for this book. Do NOT write full chapter summaries — extract only the structure, concept names, and a 1-minute overview.

Return valid JSON only. No markdown fences.

Required shape:
{
  "thesis": "one sentence — the book's central argument",
  "framework": "one paragraph — the core operating model or mental model",
  "overview": ["3–5 paragraphs covering the book's arc and value"],
  "contents": [{"title": "Part or Section Title", "chapters": ["Chapter title 1", "Chapter title 2"]}],
  "conceptTitles": ["Concept Name 1", "Concept Name 2"],
  "flashMode": {
    "slug": "1",
    "label": "Flash",
    "title": "Learn in 1 Minute",
    "duration": "1 min",
    "summary": "what you take away in 1 minute",
    "sections": [{"title": "Section title", "items": ["bullet point"]}]
  }
}

Limits:
- overview: 3–5 items, max 350 chars each
- contents: reflect the actual chapter structure, max 25 chapters total across all parts
- conceptTitles: max 15 names — ONLY the title string, no descriptions
- flashMode.sections: max 2 sections, max 5 items each, max 120 chars per item

BOOK:
${sourceText}`;
}

function normalizeBookIndex(book: Book, raw: unknown): BookIndex {
  const obj = isRecord(raw) ? raw : {};
  return {
    book: { ...book, status: "indexed" },
    thesis: stringOr(obj.thesis, "Knowledge index generated from the uploaded book."),
    framework: stringOr(obj.framework, "Core framework extracted from source text."),
    overview: stringArray(obj.overview),
    contents: normalizeContents(obj.contents),
    conceptTitles: stringArray(obj.conceptTitles),
    flashMode: normalizeFlashMode(obj.flashMode)
  };
}

function normalizeFlashMode(value: unknown): LearningMode {
  const fallback: LearningMode = {
    slug: "1", label: "Flash", title: "Learn in 1 Minute",
    duration: "1 min", summary: "Quick overview.", sections: []
  };
  if (!isRecord(value)) return fallback;
  return {
    slug: "1",
    label: stringOr(value.label, fallback.label),
    title: stringOr(value.title, fallback.title),
    duration: stringOr(value.duration, fallback.duration),
    summary: stringOr(value.summary, fallback.summary),
    sections: Array.isArray(value.sections)
      ? value.sections.filter(isRecord).map((s) => ({
          title: stringOr(s.title, "Section"),
          items: stringArray(s.items)
        }))
      : []
  };
}

// ─── Staged generation: single chapter (adaptive structure) ──────────────────

export async function generateChapterDetail(
  book: Book,
  chapterTitle: string,
  sourceText: string,
  index: BookIndex,
  lang: string = DEFAULT_LANGUAGE
): Promise<ChapterDetail> {
  const allChapterTitles = index.contents.flatMap((part) => part.chapters);
  const outline = book.pdfPath ? await loadOutline(path.join(process.cwd(), book.pdfPath)) : null;
  const isolated = isolateChapterText(sourceText, allChapterTitles, chapterTitle, outline);
  const chapterText = isolated ?? sourceText;

  const raw = await callGemini<unknown>(
    buildChapterDetailPrompt(book, chapterTitle, chapterText, index.thesis, lang, isolated === null)
  );
  const detail = normalizeChapterDetail(raw, chapterTitle);

  if (isolated) {
    warnIfEnumerationUndercounted(chapterTitle, isolated, detail);
  }

  return detail;
}

// ─── Chapter text isolation ───────────────────────────────────────────────────
// isolateChapterText itself now lives in lib/chapter-isolation.ts (imported
// above) so the standing diagnostic script can test the exact same function
// directly against real book data, rather than a reimplementation that could
// drift from what production actually runs.

// Heuristic visibility check, not a hard guarantee: counts lines that look like
// a numbered list item near the start of a line. Books format lists
// inconsistently, so this can't catch every case, but it flags the exact
// failure mode this whole rework targets — silently dropping enumerated items.
function warnIfEnumerationUndercounted(chapterTitle: string, chapterText: string, detail: ChapterDetail) {
  const numberedLines = chapterText.match(/^\s{0,3}\d{1,2}[.)]\s+\S/gm) ?? [];
  const sourceCount = numberedLines.length;

  if (sourceCount < 3) return;

  const generatedCount = detail.sections
    .filter((section): section is Extract<ChapterSection, { kind: "list" }> => section.kind === "list")
    .reduce((sum, section) => sum + section.items.length, 0);

  if (generatedCount < sourceCount) {
    console.warn(
      `[BookMind] Chapter "${chapterTitle}" may be under-counted: source text has ~${sourceCount} numbered lines, generated output has ${generatedCount} list items.`
    );
  }
}

function buildChapterDetailPrompt(
  book: Book,
  chapterTitle: string,
  chapterText: string,
  thesis: string,
  lang: string,
  isFullBookFallback: boolean
): string {
  const languageInstruction =
    lang === DEFAULT_LANGUAGE
      ? ""
      : `\n\nRespond entirely in ${languageLabel(lang)}. Every field must be written in ${languageLabel(lang)}, not English.`;

  const scopeNote = isFullBookFallback
    ? `This chapter's exact boundaries could not be isolated, so you have the full book text below. Focus ONLY on the chapter titled "${chapterTitle}" and ignore all other chapters.`
    : `The text below is the isolated content of this chapter only.`;

  return `You are BookMind, a book learning system that explains chapters the way a smart, well-read friend would — not the way an AI writes a report.

Your task has two parts.

PART 1 — Classify this chapter's shape. Decide which ONE best fits:
- "enumerated": built around a named or numbered list/framework (e.g. "10 rules," "13 mistakes," a multi-step method with named items)
- "argument": a single sustained argument or thesis developed across the chapter, not a list of separate items
- "narrative": story-driven — fiction, biography, a recounted sequence of events
- "instructional": a step-by-step process or formula taught in sequence
- "mixed": genuinely combines two of the above in a way that can't be reduced to one

PART 2 — Generate ONLY the sections that fit that shape. Never force a section type onto content that doesn't have it.

Book: "${book.title}" by ${book.author}
Thesis: ${thesis}
Chapter: "${chapterTitle}"
${scopeNote}

Return valid JSON only. No markdown fences.

{
  "chapterType": "enumerated" | "argument" | "narrative" | "instructional" | "mixed",
  "summary": ["paragraph 1, as its own array string", "paragraph 2, as its own array string", "paragraph 3 (optional), as its own array string"],
  "sections": [
    { "kind": "list", "title": "section heading", "items": [{ "label": "author's original short label", "explanation": "3-5 sentences" }] },
    { "kind": "steps", "title": "section heading", "items": [{ "step": "what to do", "explanation": "3-5 sentences on how/why" }] },
    { "kind": "prose", "title": "section heading", "paragraphs": ["2-4 substantial paragraphs"] }
  ],
  "standoutExample": { "label": "short label", "story": "2-4 sentences" },
  "actionItems": ["concrete action"]
}

Section shape guide:
- "list" — for "enumerated" chapters. If the chapter contains a numbered or explicitly named list, you MUST include every single item from the source. The item count you return must match the source exactly — never compress to a representative subset, never skip items, never merge two items into one. Keep the author's original short label for each item. Each explanation is 3-5 sentences (a short paragraph) — what it means, why it matters, and enough context that someone who hasn't read the book actually understands it, not just recognizes a label. Weave in a brief example inside the explanation if one is directly tied to that specific item — don't duplicate it elsewhere.
- "steps" — for "instructional" chapters. Capture the actual mechanism or formula in each step, not just that a step exists. Same depth as "list": 3-5 sentences per step.
- "prose" — for "argument" or "narrative" chapters. This is the chapter's main substance when there's no list to carry it, so give it real room: 2-4 full paragraphs. For narrative, trace the actual arc (what happens, in what order) with enough detail to follow the story, not a thin recap. For argument, walk through how the reasoning builds step by step, not just the conclusion.

Rules:
- "summary": 2-3 paragraphs of genuine connective narrative — explain HOW the chapter's ideas build and connect, and WHY it unfolds in that order, the way a well-read friend would walk you through it before you get to the specifics. This is the chapter's "story," not a list — do not enumerate or restate individual items here (the sections below do that), but do make the reader feel like they understand the chapter's shape before reading further. Each paragraph MUST be its own separate string in the array — never combine multiple paragraphs into one array element. The array should have 2-3 elements, not 1.
- "sections": at least one. An enumerated chapter normally needs exactly one "list" section containing every item — don't split items across multiple sections or add a second section that just repeats them in prose.
- "standoutExample": omit this field entirely unless there's one genuinely distinct, memorable story worth calling out on its own, separate from anything already covered inside a list/steps item. Most chapters should omit it.
- "actionItems": omit this field entirely if the chapter has no real actionable takeaway (most narrative/biography chapters won't). Only include it when the chapter actually supports concrete action, and keep items distinct from what the sections above already say.
- Overall, this should read like a satisfying short-form version of the chapter — long enough that someone genuinely understands it without reading the original, short enough that it's clearly a condensed read, not a spec sheet or bullet dump. A chapter with many distinct enumerated points will naturally run longer than a single-argument chapter, because each point now earns a real explanation, not a label — that's expected and correct. Don't pad a short chapter to hit a length target, and don't compress a long enumerated chapter's item count to hit one either.
- Write in short, direct sentences. Define any technical or niche term the moment you use it. Do not use stiff AI-summary phrasing — avoid "it is important to note," "furthermore," "this underscores," "delve into," "moreover," "in essence," "overall." Write like you're explaining it to a smart friend, not writing a report.
- This must work for any genre — fiction, biography, technical, academic, business. Do not assume a business/self-help framing.${languageInstruction}

CHAPTER TEXT:
${chapterText}`;
}

function languageLabel(code: string): string {
  return LANGUAGES.find((language) => language.code === code)?.label ?? code;
}

function normalizeChapterDetail(raw: unknown, fallbackTitle: string): ChapterDetail {
  const obj = isRecord(raw) ? raw : {};

  const detail: ChapterDetail = {
    title: stringOr(obj.title, fallbackTitle),
    chapterType: normalizeChapterType(obj.chapterType),
    summary: toParagraphs(obj.summary),
    sections: normalizeSections(obj.sections)
  };

  const standoutExample = normalizeStandoutExample(obj.standoutExample);
  if (standoutExample) detail.standoutExample = standoutExample;

  const actionItems = stringArray(obj.actionItems);
  if (actionItems.length > 0) detail.actionItems = actionItems;

  return detail;
}

function normalizeChapterType(value: unknown): ChapterType {
  const allowed: ChapterType[] = ["enumerated", "argument", "narrative", "instructional", "mixed"];
  return allowed.includes(value as ChapterType) ? (value as ChapterType) : "mixed";
}

function normalizeSections(value: unknown): ChapterSection[] {
  if (!Array.isArray(value)) return [];

  const sections: ChapterSection[] = [];

  for (const raw of value) {
    if (!isRecord(raw)) continue;
    const title = stringOr(raw.title, "");

    if (raw.kind === "list" && Array.isArray(raw.items)) {
      const items = raw.items
        .filter(isRecord)
        .map((item) => ({ label: stringOr(item.label, ""), explanation: stringOr(item.explanation, "") }))
        .filter((item) => item.label || item.explanation);
      if (items.length > 0) sections.push({ kind: "list", title, items });
      continue;
    }

    if (raw.kind === "steps" && Array.isArray(raw.items)) {
      const items = raw.items
        .filter(isRecord)
        .map((item) => ({ step: stringOr(item.step, ""), explanation: stringOr(item.explanation, "") }))
        .filter((item) => item.step || item.explanation);
      if (items.length > 0) sections.push({ kind: "steps", title, items });
      continue;
    }

    if (raw.kind === "prose") {
      const paragraphs = stringArray(raw.paragraphs);
      if (paragraphs.length > 0) sections.push({ kind: "prose", title, paragraphs });
    }
  }

  return sections;
}

function normalizeStandoutExample(value: unknown): { label: string; story: string } | undefined {
  if (!isRecord(value)) return undefined;
  const label = stringOr(value.label, "");
  const story = stringOr(value.story, "");
  return label && story ? { label, story } : undefined;
}

// Accepts either the requested string[] or (defensively) a single string,
// in case Gemini doesn't follow the array format exactly.
function toParagraphs(value: unknown): string[] {
  if (Array.isArray(value)) return stringArray(value);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

// ─── Staged generation: learning modes (10 / 30) ─────────────────────────────
// "full" was removed: it duplicated Overview + Chapters while being the most
// expensive generation call (whole-book prompt), most likely to hit API quota.

type ModeConfig = {
  label: string;
  title: string;
  duration: string;
  maxSections: number;
  maxItemsPerSection: number;
  maxItemChars: number;
  depthInstruction: string;
};

const MODE_CONFIG: Record<string, ModeConfig> = {
  "10": {
    label: "Core", title: "Learn in 10 Minutes", duration: "10 min",
    maxSections: 4, maxItemsPerSection: 6, maxItemChars: 150,
    depthInstruction: "Cover the core framework and the most important principles and how they fit together. More depth than a 1-minute flash but still concise."
  },
  "30": {
    label: "Deep", title: "Learn in 30 Minutes", duration: "30 min",
    maxSections: 6, maxItemsPerSection: 8, maxItemChars: 200,
    depthInstruction: "Cover chapter-by-chapter key ideas with more nuance and more examples than the 10-minute mode."
  }
};

export async function generateLearningMode(
  book: Book,
  modeSlug: string,
  sourceText: string,
  index: BookIndex
): Promise<LearningMode> {
  const config = MODE_CONFIG[modeSlug];

  if (!config) {
    throw new Error(`Unknown learning mode: ${modeSlug}`);
  }

  const raw = await callGemini<unknown>(buildModePrompt(book, modeSlug, config, sourceText, index));
  return normalizeGeneratedMode(raw, modeSlug, config);
}

function buildModePrompt(
  book: Book,
  modeSlug: string,
  config: ModeConfig,
  sourceText: string,
  index: BookIndex
): string {
  return `You are BookMind, a book learning system.

Generate the "${config.title}" (${config.label}) mode for this book.

Book: "${book.title}" by ${book.author}
Thesis: ${index.thesis}
Framework: ${index.framework}

Return valid JSON only. No markdown fences.

{
  "slug": "${modeSlug}",
  "label": "${config.label}",
  "title": "${config.title}",
  "duration": "${config.duration}",
  "summary": "one sentence describing what the reader takes away from this mode",
  "sections": [{"title": "Section title", "items": ["bullet point"]}]
}

Limits:
- sections: max ${config.maxSections}
- items per section: max ${config.maxItemsPerSection}
- max ${config.maxItemChars} chars per item

${config.depthInstruction}

BOOK:
${sourceText}`;
}

function normalizeGeneratedMode(raw: unknown, modeSlug: string, config: ModeConfig): LearningMode {
  const obj = isRecord(raw) ? raw : {};
  const fallback: LearningMode = {
    slug: modeSlug as LearningMode["slug"],
    label: config.label,
    title: config.title,
    duration: config.duration,
    summary: "Generated learning mode.",
    sections: []
  };

  return {
    slug: modeSlug as LearningMode["slug"],
    label: stringOr(obj.label, fallback.label),
    title: stringOr(obj.title, fallback.title),
    duration: stringOr(obj.duration, fallback.duration),
    summary: stringOr(obj.summary, fallback.summary),
    sections: Array.isArray(obj.sections)
      ? obj.sections.filter(isRecord).map((s) => ({
          title: stringOr(s.title, "Section"),
          items: stringArray(s.items)
        }))
      : []
  };
}
