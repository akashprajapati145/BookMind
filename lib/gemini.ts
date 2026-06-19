import { DEFAULT_LANGUAGE, LANGUAGES } from "@/lib/languages";
import type { ActionPlan, Book, BookIndex, ChapterDetail, ChapterKnowledge, Concept, ContentPart, Example, JourneyNode, KnowledgePackage, LearningMode } from "@/lib/types";

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

// ─── Staged generation: single chapter ───────────────────────────────────────

export async function generateChapterDetail(
  book: Book,
  chapterTitle: string,
  sourceText: string,
  index: BookIndex,
  lang: string = DEFAULT_LANGUAGE
): Promise<ChapterDetail> {
  const raw = await callGemini<unknown>(buildChapterDetailPrompt(book, chapterTitle, sourceText, index.thesis, lang));
  return normalizeChapterDetail(raw, chapterTitle);
}

function buildChapterDetailPrompt(
  book: Book,
  chapterTitle: string,
  sourceText: string,
  thesis: string,
  lang: string
): string {
  // English prompt is unchanged from the original — only non-English languages
  // get an appended instruction, so the existing English generation flow is untouched.
  const languageInstruction =
    lang === DEFAULT_LANGUAGE
      ? ""
      : `\n\nRespond entirely in ${languageLabel(lang)}. Every field (title, summary, keyIdeas, examples, actionItems) must be written in ${languageLabel(lang)}, not English.`;

  return `You are BookMind, a book learning system.

Generate detailed knowledge for ONE specific chapter.

Book: "${book.title}" by ${book.author}
Thesis: ${thesis}
Chapter to analyze: "${chapterTitle}"

Return valid JSON only. No markdown fences.

{
  "title": "${chapterTitle}",
  "summary": ["paragraph 1", "paragraph 2", "paragraph 3 (optional)"],
  "keyIdeas": ["key idea or principle introduced in this chapter"],
  "examples": ["specific example or story used in this chapter"],
  "actionItems": ["one concrete action derived from this chapter's lessons"]
}

The "summary" field is the most important part of this response. Its job is NOT to
restate the keyIdeas/examples/actionItems below at lower resolution — it must explain
HOW the chapter's ideas connect and build on each other, and WHY the chapter unfolds
in that order. Write it as if walking a curious reader through the chapter's reasoning
in plain, accessible language, the way you'd explain it out loud to someone who hasn't
read the book. A reader should finish it actually understanding the chapter's argument,
not just recognizing a list of facts about it.

Limits:
- summary: 2-3 short paragraphs, 150-250 words total, plain language, no jargon
- keyIdeas: max 5 items, max 200 chars each
- examples: max 4 items, max 300 chars each
- actionItems: max 4 items, max 200 chars each

Focus ONLY on the chapter titled "${chapterTitle}". Extract specific examples and ideas from that section.${languageInstruction}

FULL BOOK TEXT:
${sourceText}`;
}

function languageLabel(code: string): string {
  return LANGUAGES.find((language) => language.code === code)?.label ?? code;
}

function normalizeChapterDetail(raw: unknown, fallbackTitle: string): ChapterDetail {
  const obj = isRecord(raw) ? raw : {};
  return {
    title: stringOr(obj.title, fallbackTitle),
    summary: toParagraphs(obj.summary),
    keyIdeas: stringArray(obj.keyIdeas),
    examples: stringArray(obj.examples),
    actionItems: stringArray(obj.actionItems)
  };
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
