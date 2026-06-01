export type BookStatus = "ready" | "processing" | "failed";

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
