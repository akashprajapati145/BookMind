import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { AutoIndexGenerator } from "@/components/auto-index-generator";
import { BookHero } from "@/components/book-hero";
import { BookNavTabs } from "@/components/book-nav-tabs";
import { DepthCard } from "@/components/depth-card";
import { KnowledgeSection } from "@/components/knowledge-section";
import { RemoveBookButton } from "@/components/remove-book-button";
import { getBookIndex, getKnowledgePackage } from "@/lib/books";
import { routes } from "@/lib/routes";
import type { LearningMode } from "@/lib/types";

type BookPageProps = {
  params: Promise<{ slug: string }>;
};

// "full" mode was removed — it duplicated Overview + Chapters while being the
// most expensive generation call (whole-book prompt), most likely to hit API quota.
const STUB_MODES: LearningMode[] = [
  {
    slug: "10", label: "Core", title: "Learn in 10 Minutes", duration: "10 min",
    summary: "A focused deep dive into the core ideas, frameworks, and key insights.",
    sections: []
  },
  {
    slug: "30", label: "Deep", title: "Learn in 30 Minutes", duration: "30 min",
    summary: "Complete understanding of the author's argument, chapter by chapter.",
    sections: []
  }
];

export default async function BookPage({ params }: BookPageProps) {
  const { slug } = await params;

  const bookIndex = getBookIndex(slug);
  const knowledge = bookIndex ? null : getKnowledgePackage(slug);

  if (!bookIndex && !knowledge) {
    notFound();
  }

  const book = bookIndex?.book ?? knowledge!.book;
  const thesis = bookIndex?.thesis ?? knowledge!.thesis;
  const framework = bookIndex?.framework ?? knowledge!.framework;
  const overview = bookIndex?.overview ?? knowledge!.overview;
  const displayModes = bookIndex
    ? [bookIndex.flashMode, ...STUB_MODES]
    : knowledge!.learningModes;

  // "extracted" means the PDF is uploaded but the index hasn't been generated yet.
  // AutoIndexGenerator auto-calls /api/books/[slug]/index on mount, then refreshes the page.
  // No thesis is shown here — the only thesis available at this point is a stale
  // placeholder written at upload time, and AutoIndexGenerator already communicates progress.
  if (book.status === "extracted") {
    return (
      <AppShell>
        <BookHero
          book={book}
          actions={<RemoveBookButton slug={slug} />}
        />
        <AutoIndexGenerator slug={slug} />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <BookHero
        book={book}
        thesis={thesis}
        actions={
          <>
            <Link href={routes.learn(slug, "1")} className="rounded-full bg-primary px-5 py-3 font-bold text-on-primary">
              Start Learning
            </Link>
            <RemoveBookButton slug={slug} />
          </>
        }
      />

      <BookNavTabs slug={slug} active="overview" />

      <section className={`grid gap-5 ${displayModes.length === 3 ? "md:grid-cols-3" : "md:grid-cols-4"}`}>
        {displayModes.map((mode) => (
          <DepthCard key={mode.slug} slug={slug} mode={mode} />
        ))}
      </section>

      <section className="mt-10 grid gap-5 lg:grid-cols-[1fr_0.8fr]">
        <KnowledgeSection eyebrow="Overview" title="What this book teaches">
          <div className="space-y-4 leading-7">
            {overview.map((item) => (
              <p key={item}>{item}</p>
            ))}
          </div>
        </KnowledgeSection>
        <KnowledgeSection eyebrow="Framework" title="Core operating model">
          <p className="leading-7">{framework}</p>
        </KnowledgeSection>
      </section>
    </AppShell>
  );
}
