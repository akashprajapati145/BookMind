import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { KnowledgeSection } from "@/components/knowledge-section";
import { PageHeader } from "@/components/page-header";
import { getKnowledgePackage } from "@/lib/books";

type ChaptersPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ChaptersPage({ params }: ChaptersPageProps) {
  const { slug } = await params;
  const knowledge = getKnowledgePackage(slug);

  if (!knowledge) {
    notFound();
  }

  return (
    <AppShell>
      <PageHeader eyebrow={knowledge.book.title} title="Contents & Chapters" description="Original hierarchy plus chapter-level knowledge." />
      <section className="mb-8 grid gap-4 md:grid-cols-3">
        {knowledge.contents.map((part) => (
          <KnowledgeSection key={part.title} title={part.title}>
            <ul className="space-y-2">
              {part.chapters.map((chapter) => (
                <li key={chapter} className="text-sm leading-6">{chapter}</li>
              ))}
            </ul>
          </KnowledgeSection>
        ))}
      </section>
      <section className="grid gap-5">
        {knowledge.chapters.map((chapter) => (
          <KnowledgeSection key={chapter.title} eyebrow="Chapter" title={chapter.title}>
            <p className="mb-5 leading-7">{chapter.summary}</p>
            <div className="grid gap-4 md:grid-cols-3">
              <List title="Key Ideas" items={chapter.keyIdeas} />
              <List title="Examples" items={chapter.examples} />
              <List title="Action Items" items={chapter.actionItems} />
            </div>
          </KnowledgeSection>
        ))}
      </section>
    </AppShell>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
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
