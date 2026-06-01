import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { KnowledgeSection } from "@/components/knowledge-section";
import { PageHeader } from "@/components/page-header";
import { getKnowledgePackage } from "@/lib/books";

type ActionsPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ActionsPage({ params }: ActionsPageProps) {
  const { slug } = await params;
  const knowledge = getKnowledgePackage(slug);

  if (!knowledge) {
    notFound();
  }

  const groups = [
    ["Tomorrow", knowledge.actions.tomorrow],
    ["This Week", knowledge.actions.thisWeek],
    ["This Month", knowledge.actions.thisMonth]
  ] as const;

  return (
    <AppShell>
      <PageHeader eyebrow={knowledge.book.title} title="Action Plan" description="Turn knowledge into execution without losing the book's original intent." />
      <div className="grid gap-5 md:grid-cols-3">
        {groups.map(([title, items]) => (
          <KnowledgeSection key={title} eyebrow="Execute" title={title}>
            <ul className="space-y-4 leading-7">
              {items.map((item) => (
                <li key={item} className="border-b border-white/10 pb-4 last:border-0">{item}</li>
              ))}
            </ul>
          </KnowledgeSection>
        ))}
      </div>
    </AppShell>
  );
}
