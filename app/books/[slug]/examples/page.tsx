import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { KnowledgeSection } from "@/components/knowledge-section";
import { PageHeader } from "@/components/page-header";
import { getKnowledgePackage } from "@/lib/books";

type ExamplesPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ExamplesPage({ params }: ExamplesPageProps) {
  const { slug } = await params;
  const knowledge = getKnowledgePackage(slug);

  if (!knowledge) {
    notFound();
  }

  return (
    <AppShell>
      <PageHeader eyebrow={knowledge.book.title} title="Examples & Stories" description="Examples are preserved because they carry the context generic summaries usually lose." />
      <div className="grid gap-5">
        {knowledge.examples.map((example) => (
          <KnowledgeSection key={example.concept} eyebrow="Example" title={example.concept}>
            <div className="grid gap-4 md:grid-cols-2">
              <p><span className="font-bold text-on-background">Author example: </span>{example.authorExample}</p>
              <p><span className="font-bold text-on-background">Story: </span>{example.story}</p>
              <p><span className="font-bold text-on-background">Modern example: </span>{example.modernExample}</p>
              <p><span className="font-bold text-on-background">Personal application: </span>{example.personalApplication}</p>
            </div>
          </KnowledgeSection>
        ))}
      </div>
    </AppShell>
  );
}
