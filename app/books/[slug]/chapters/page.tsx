import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { BookNavTabs } from "@/components/book-nav-tabs";
import { ChaptersClientShell } from "@/components/chapters-client-shell";
import { ChaptersProgressBar } from "@/components/chapters-progress-bar";
import { KnowledgeSection } from "@/components/knowledge-section";
import { getAllChapterDetails, getBookIndex, getKnowledgePackage } from "@/lib/books";
import { toSlug } from "@/lib/slug";

type ChaptersPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ChaptersPage({ params }: ChaptersPageProps) {
  const { slug } = await params;

  const bookIndex = await getBookIndex(slug);
  const knowledge = bookIndex ? null : await getKnowledgePackage(slug);

  if (!bookIndex && !knowledge) {
    return notFound();
  }

  const bookTitle = bookIndex?.book.title ?? knowledge!.book.title;
  const contents = bookIndex?.contents ?? knowledge!.contents;
  const chapterTitles = contents.flatMap((part) => part.chapters);

  const allInitialDetails = bookIndex
    ? await Promise.all(chapterTitles.map((title) => getAllChapterDetails(slug, toSlug(title))))
    : [];

  return (
    <AppShell>
      <BookNavTabs slug={slug} active="chapters" />

      <div className="mb-8">
        <p className="mb-1 text-xs font-bold uppercase tracking-[0.22em] text-secondary">{bookTitle}</p>
        <h1 className="font-display text-4xl font-bold text-on-background">Contents & Chapters</h1>
        <ChaptersProgressBar slug={slug} total={chapterTitles.length} chapterTitles={chapterTitles} />
      </div>

      {bookIndex ? (
        <ChaptersClientShell
          slug={slug}
          chapterTitles={chapterTitles}
          allInitialDetails={allInitialDetails}
        />
      ) : (
        /* Legacy books without index */
        <div className="space-y-5">
          {knowledge!.chapters.map((chapter) => (
            <div key={chapter.title} id={`chapter-${toSlug(chapter.title)}`} className="scroll-mt-24">
              <KnowledgeSection eyebrow="Chapter" title={chapter.title}>
                <p className="mb-5 leading-7">{chapter.summary}</p>
                <div className="grid gap-4 md:grid-cols-3">
                  <LegacyList title="Key Ideas" items={chapter.keyIdeas} />
                  <LegacyList title="Examples" items={chapter.examples} />
                  <LegacyList title="Action Items" items={chapter.actionItems} />
                </div>
              </KnowledgeSection>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}

function LegacyList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.16em] text-secondary">{title}</h3>
      <ul className="space-y-2 text-sm leading-6">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
