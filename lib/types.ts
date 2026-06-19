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

// Per-chapter detail — stored as chapters/[chapter-slug].json, generated on demand.
export type ChapterDetail = {
  title: string;
  summary: string[];   // 2-3 paragraphs explaining how the chapter's ideas connect, not a restatement of keyIdeas
  keyIdeas: string[];
  examples: string[];
  actionItems: string[];
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
