import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { GlassCard } from "@/components/glass-card";
import { PageHeader } from "@/components/page-header";
import { getKnowledgePackage } from "@/lib/books";
import { routes } from "@/lib/routes";

type JourneyPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function JourneyPage({ params }: JourneyPageProps) {
  const { slug } = await params;
  const knowledge = getKnowledgePackage(slug);

  if (!knowledge) {
    notFound();
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow={knowledge.book.title}
        title="Learning Journey"
        description="A visual path through the author's idea progression."
        action={<Link href={routes.book(slug)} className="glass rounded-full px-5 py-3 font-bold">Dashboard</Link>}
      />
      <div className="grid gap-4">
        {knowledge.journey.map((node, index) => (
          <GlassCard key={node.title} className="grid gap-4 p-5 md:grid-cols-[80px_1fr] md:items-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary font-bold text-on-primary">
              {index + 1}
            </div>
            <div>
              <h2 className="font-display text-3xl font-bold text-on-background">{node.title}</h2>
              <p className="mt-2 text-on-surface-variant">{node.description}</p>
            </div>
          </GlassCard>
        ))}
      </div>
    </AppShell>
  );
}
