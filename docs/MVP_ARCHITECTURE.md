# BookMind MVP Architecture

## 1. Recommended Folder Structure

```text
app/
  page.tsx
  library/page.tsx
  upload/page.tsx
  books/[slug]/page.tsx
  books/[slug]/learn/[mode]/page.tsx
  books/[slug]/journey/page.tsx
  books/[slug]/concepts/page.tsx
  books/[slug]/examples/page.tsx
  books/[slug]/chapters/page.tsx
  books/[slug]/actions/page.tsx
  books/[slug]/reader/page.tsx
  api/upload/route.ts
components/
  app-shell.tsx
  book-card.tsx
  book-hero.tsx
  depth-card.tsx
  glass-card.tsx
  knowledge-section.tsx
  page-header.tsx
  progress-bar.tsx
  upload-dropzone.tsx
lib/
  books.ts
  knowledge.ts
  routes.ts
  types.ts
public/
  covers/
storage/
  books/
  knowledge/
  library.json
stitch_bookmind_knowledge_experience/
  ...
```

The Stitch export remains as the design source of truth. Production app code lives in `app/`, `components/`, and `lib/`. Persistent MVP content lives in `storage/`.

## 2. Route Structure

```text
/                         Home, upload CTA, continue learning, recommended books
/upload                   PDF upload and processing entry point
/library                  Uploaded books in a streaming-library layout
/books/[slug]             Book dashboard and learning-depth launcher
/books/[slug]/learn/1     1 minute learning mode
/books/[slug]/learn/10    10 minute learning mode
/books/[slug]/learn/30    30 minute learning mode
/books/[slug]/learn/full  Full-depth mode
/books/[slug]/journey     Idea progression map
/books/[slug]/concepts    Concept cards
/books/[slug]/examples    Preserved examples, stories, case studies
/books/[slug]/chapters    Chapter hierarchy and chapter knowledge
/books/[slug]/actions     Tomorrow, this week, this month actions
/books/[slug]/reader      Original PDF/source reading surface
```

## 3. Shared Component Architecture

- `AppShell`: fixed glass navigation, page background, max-width content frame.
- `PageHeader`: editorial title, eyebrow, optional action.
- `BookCard`: cover-first discovery card with progress and knowledge status.
- `BookHero`: book dashboard hero with cover, metadata, progress, and CTA.
- `DepthCard`: learning-depth choices: 1 minute, 10 minutes, 30 minutes, full depth.
- `GlassCard`: reusable Stitch-style translucent panel.
- `KnowledgeSection`: titled content section for summaries, concepts, examples, and actions.
- `ProgressBar`: ultra-thin emerald progress indicator.
- `UploadDropzone`: PDF upload surface and future processing state.

## 4. Data Model

```ts
type Book = {
  slug: string;
  title: string;
  author: string;
  cover: string;
  readingTime: string;
  status: "ready" | "processing" | "failed";
  progress: number;
  addedAt: string;
  pdfPath?: string;
};

type KnowledgePackage = {
  book: Book;
  learningModes: {
    oneMinute: LearningMode;
    tenMinutes: LearningMode;
    thirtyMinutes: LearningMode;
    fullDepth: LearningMode;
  };
  overview: Overview;
  journey: JourneyNode[];
  contents: ContentPart[];
  chapters: ChapterKnowledge[];
  concepts: Concept[];
  examples: Example[];
  actions: ActionPlan;
};
```

MVP storage uses `storage/library.json` plus generated knowledge files under `storage/knowledge/[slug]/`. No database, auth, vector search, RAG, agents, or payments.

AI provider constraint: use Google Gemini with `GOOGLE_API_KEY` if generation is needed. Do not add OpenAI dependencies, environment variables, or API calls.

## 5. Development Plan

1. Create a Next.js + TypeScript + Tailwind foundation that preserves the Stitch design system.
2. Seed local storage with an Atomic Habits knowledge package so every core page is browsable before AI generation exists.
3. Build Home, Library, and Book Dashboard as the first working UI milestone.
4. Build learning modes, journey, concepts, examples, chapters, actions, and reader routes.
5. Add PDF upload to `storage/books/` and append metadata to `storage/library.json`.
6. Add PDF text extraction with `pdf-parse`.
7. Add Google Gemini knowledge-package generation and markdown persistence. Do not use OpenAI APIs.
8. Replace seed content display with generated markdown-backed content.
