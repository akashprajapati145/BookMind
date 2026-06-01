import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { KnowledgeSection } from "@/components/knowledge-section";
import { PageHeader } from "@/components/page-header";
import { getKnowledgePackage } from "@/lib/books";

type ConceptsPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ConceptsPage({ params }: ConceptsPageProps) {
  const { slug } = await params;
  const knowledge = getKnowledgePackage(slug);

  if (!knowledge) {
    notFound();
  }

  return (
    <AppShell>
      <PageHeader eyebrow={knowledge.book.title} title="Core Concepts" description="Concept-first learning for the ideas that matter most." />
      <div className="grid gap-5 md:grid-cols-2">
        {knowledge.concepts.map((concept) => (
          <KnowledgeSection key={concept.title} eyebrow="Concept" title={concept.title}>
            <p className="leading-7">{concept.description}</p>
            <p className="mt-4 border-t border-white/10 pt-4 leading-7 text-on-surface">
              <span className="font-bold text-secondary">Why it matters: </span>
              {concept.whyItMatters}
            </p>
          </KnowledgeSection>
        ))}
      </div>
    </AppShell>
  );
}
