import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { BookNavTabs } from "@/components/book-nav-tabs";
import { ChapterDetailLoader } from "@/components/chapter-detail-loader";
import { KnowledgeSection } from "@/components/knowledge-section";
import { PageHeader } from "@/components/page-header";
import { getBookIndex, getChapterDetail, getKnowledgePackage } from "@/lib/books";
import { toSlug } from "@/lib/slug";

type ChaptersPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ChaptersPage({ params }: ChaptersPageProps) {
  const { slug } = await params;

  const bookIndex = getBookIndex(slug);
  const knowledge = bookIndex ? null : getKnowledgePackage(slug);

  if (!bookIndex && !knowledge) {
    notFound();
  }

  const bookTitle = bookIndex?.book.title ?? knowledge!.book.title;
  const contents = bookIndex?.contents ?? knowledge!.contents;

  // Flat list of all chapter titles from the table of contents
  const chapterTitles = contents.flatMap((part) => part.chapters);

  return (
    <AppShell>
      <PageHeader
        eyebrow={bookTitle}
        title="Contents & Chapters"
        description="Original hierarchy plus chapter-level knowledge."
      />

      <BookNavTabs slug={slug} active="chapters" />

      {/* Table of contents grid */}
      <section className="mb-8 grid gap-4 md:grid-cols-3">
        {contents.map((part) => (
          <KnowledgeSection key={part.title} title={part.title}>
            <ul className="space-y-2">
              {part.chapters.map((chapter) => (
                <li key={chapter} className="text-sm leading-6">{chapter}</li>
              ))}
            </ul>
          </KnowledgeSection>
        ))}
      </section>

      {/* Chapter detail section */}
      <section className="grid gap-5">
        {bookIndex ? (
          // Indexed books: chapters already generated in a past session are read
          // from disk here and rendered immediately — no fetch, no re-generation.
          // Only chapters never visited before show the "Load" button.
          chapterTitles.map((title) => (
            <KnowledgeSection key={title} eyebrow="Chapter" title={title}>
              <ChapterDetailLoader
                slug={slug}
                chapterTitle={title}
                initialDetail={getChapterDetail(slug, toSlug(title))}
              />
            </KnowledgeSection>
          ))
        ) : (
          // Legacy books (full package.json): render all chapter data immediately
          knowledge!.chapters.map((chapter) => (
            <KnowledgeSection key={chapter.title} eyebrow="Chapter" title={chapter.title}>
              <p className="mb-5 leading-7">{chapter.summary}</p>
              <div className="grid gap-4 md:grid-cols-3">
                <LegacyList title="Key Ideas" items={chapter.keyIdeas} />
                <LegacyList title="Examples" items={chapter.examples} />
                <LegacyList title="Action Items" items={chapter.actionItems} />
              </div>
            </KnowledgeSection>
          ))
        )}
      </section>
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
