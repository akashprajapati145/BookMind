import type { ActionPlan, Book, ChapterKnowledge, Concept, ContentPart, Example, JourneyNode, KnowledgePackage, LearningMode } from "@/lib/types";

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
const chunkSize = 45000;

export async function generateKnowledgePackage(book: Book, sourceText: string, options: GenerationOptions = {}): Promise<KnowledgePackage> {
  const chunks = splitIntoChunks(sourceText, chunkSize);
  const chunkKnowledge: ChunkKnowledge[] = [];

  for (const [index, chunk] of chunks.entries()) {
    const generatedChunk = normalizeChunkKnowledge(await callGemini(buildChunkPrompt(chunk, index + 1, chunks.length)), index + 1);
    chunkKnowledge.push(generatedChunk);
    await options.onChunk?.(generatedChunk);
  }

  const generated = await callGemini(buildMergePrompt(chunkKnowledge));

  return normalizeKnowledgePackage(book, generated);
}

async function callGemini<T = GeneratedKnowledge>(prompt: string): Promise<T> {
  const keys = [process.env.GOOGLE_API_KEY, process.env.GOOGLE_API_KEY_FALLBACK].filter(Boolean) as string[];

  if (keys.length === 0) {
    throw new Error("GOOGLE_API_KEY is missing.");
  }

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

  for (const key of keys) {
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
