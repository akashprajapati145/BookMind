import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { AutoModeGenerator } from "@/components/auto-mode-generator";
import { KnowledgeSection } from "@/components/knowledge-section";
import { PageHeader } from "@/components/page-header";
import { getBookIndex, getKnowledgePackage, getMode } from "@/lib/books";
import { routes } from "@/lib/routes";
import type { LearningMode } from "@/lib/types";

type LearnPageProps = {
  params: Promise<{ slug: string; mode: string }>;
};

export default async function LearnPage({ params }: LearnPageProps) {
  const { slug, mode } = await params;

  const bookIndex = getBookIndex(slug);
  const knowledge = bookIndex ? null : getKnowledgePackage(slug);

  if (!bookIndex && !knowledge) {
    notFound();
  }

  const bookTitle = bookIndex?.book.title ?? knowledge!.book.title;

  let learningMode: LearningMode | undefined;

  if (bookIndex) {
    // Flash mode lives in the index. 10/30 are generated on demand and
    // cached to modes/[mode].json — check disk before ever calling Gemini.
    // "full" was removed — it duplicated Overview + Chapters while being the
    // single most expensive generation call (whole-book prompt, most likely to hit quota).
    learningMode = mode === "1" ? bookIndex.flashMode : getMode(slug, mode);
  } else {
    learningMode = knowledge!.learningModes.find((m) => m.slug === mode);
  }

  // Indexed book, mode not generated yet: auto-trigger generation (same pattern as the index itself).
  if (!learningMode && bookIndex && ["10", "30"].includes(mode)) {
    return (
      <AppShell>
        <PageHeader
          eyebrow={bookTitle}
          title="Preparing this learning mode"
          description="This will only take a moment."
          action={
            <Link href={routes.book(slug)} className="glass rounded-full px-5 py-3 font-bold">
              Book Dashboard
            </Link>
          }
        />
        <AutoModeGenerator slug={slug} mode={mode} />
      </AppShell>
    );
  }

  if (!learningMode) {
    notFound();
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow={bookTitle}
        title={learningMode.title}
        description={learningMode.summary}
        action={
          <Link href={routes.book(slug)} className="glass rounded-full px-5 py-3 font-bold">
            Book Dashboard
          </Link>
        }
      />
      <div className="grid gap-5 lg:grid-cols-3">
        {learningMode.sections.map((section) => (
          <KnowledgeSection key={section.title} title={section.title}>
            <ul className="space-y-3 leading-7">
              {section.items.map((item) => (
                <li key={item} className="border-b border-white/10 pb-3 last:border-0">
                  {item}
                </li>
              ))}
            </ul>
          </KnowledgeSection>
        ))}
      </div>
    </AppShell>
  );
}
