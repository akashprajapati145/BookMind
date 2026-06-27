export type BookStatus = "ready" | "processing" | "extracted" | "indexed" | "failed";

export type Book = {
  slug: string;
  title: string;
  author: string;
  category: string;
  cover: string;
  readingTime: string;
  status: BookStatus;
  progress: number;
  addedAt: string;
  pdfPath?: string;
};

export type LearningMode = {
  slug: "1" | "10" | "30" | "full";
  label: string;
  title: string;
  duration: string;
  summary: string;
  sections: Array<{
    title: string;
    items: string[];
  }>;
};

export type JourneyNode = {
  title: string;
  description: string;
};

export type ContentPart = {
  title: string;
  chapters: string[];
};

export type ChapterKnowledge = {
  title: string;
  summary: string;
  keyIdeas: string[];
  examples: string[];
  actionItems: string[];
};

export type Concept = {
  title: string;
  description: string;
  whyItMatters: string;
};

export type Example = {
  concept: string;
  authorExample: string;
  story: string;
  modernExample: string;
  personalApplication: string;
};

export type ActionPlan = {
  tomorrow: string[];
  thisWeek: string[];
  thisMonth: string[];
};

// Lightweight index generated fast on first visit to the book dashboard.
// Chapter summaries, full concepts, examples, and actions are lazy-loaded separately.
export type BookIndex = {
  book: Book;
  thesis: string;
  framework: string;
  overview: string[];
  contents: ContentPart[];    // chapter titles only — no summaries
  conceptTitles: string[];    // concept names only — no descriptions
  flashMode: LearningMode;    // 1-minute mode — cheapest to generate, highest value
};

// Adaptive chapter content — the model classifies the chapter's shape and only
// produces the section types that actually fit it. A chapter built around a
// named/numbered list (e.g. "10 rules") gets a "list" section with every item
// present; a narrative chapter gets "prose"; an instructional chapter gets
// "steps". No section type is forced onto content that doesn't have it.
export type ChapterSectionKind = "prose" | "list" | "steps";

export type ChapterSection =
  | { kind: "prose"; title: string; paragraphs: string[] }
  | { kind: "list"; title: string; items: Array<{ label: string; explanation: string }> }
  | { kind: "steps"; title: string; items: Array<{ step: string; explanation: string }> };

export type ChapterType = "enumerated" | "argument" | "narrative" | "instructional" | "mixed";

// Per-chapter detail — stored as chapters/[chapter-slug].json, generated on demand.
export type ChapterDetail = {
  title: string;
  chapterType: ChapterType;
  summary: string[];                              // short framing/orientation — always present
  sections: ChapterSection[];                       // the adaptive part — one or more
  standoutExample?: { label: string; story: string };  // only if genuinely distinct, not routine
  actionItems?: string[];                           // omitted entirely when the chapter has none
};

export type KnowledgePackage = {
  book: Book;
  thesis: string;
  framework: string;
  learningModes: LearningMode[];
  overview: string[];
  journey: JourneyNode[];
  contents: ContentPart[];
  chapters: ChapterKnowledge[];
  concepts: Concept[];
  examples: Example[];
  actions: ActionPlan;
};
