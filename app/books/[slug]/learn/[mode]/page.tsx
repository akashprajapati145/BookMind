import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { KnowledgeSection } from "@/components/knowledge-section";
import { PageHeader } from "@/components/page-header";
import { getKnowledgePackage } from "@/lib/books";
import { routes } from "@/lib/routes";

type LearnPageProps = {
  params: Promise<{ slug: string; mode: string }>;
};

export default async function LearnPage({ params }: LearnPageProps) {
  const { slug, mode } = await params;
  const knowledge = getKnowledgePackage(slug);
  const learningMode = knowledge?.learningModes.find((item) => item.slug === mode);

  if (!knowledge || !learningMode) {
    notFound();
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow={knowledge.book.title}
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
