import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { GlassCard } from "@/components/glass-card";
import { PageHeader } from "@/components/page-header";
import { getKnowledgePackage } from "@/lib/books";

type ReaderPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ReaderPage({ params }: ReaderPageProps) {
  const { slug } = await params;
  const knowledge = getKnowledgePackage(slug);

  if (!knowledge) {
    notFound();
  }

  return (
    <AppShell>
      <PageHeader eyebrow={knowledge.book.title} title="Reading Mode" description="The original PDF will appear here after upload. For the seed book, this route reserves the focused source-reading surface." />
      <GlassCard className="min-h-[620px] p-6">
        <div className="mx-auto max-w-3xl">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.22em] text-secondary">Source Preview</p>
          <h2 className="font-display text-4xl font-bold text-on-background">PDF viewer placeholder</h2>
          <p className="mt-4 leading-7 text-on-surface-variant">
            MVP storage already tracks `pdfPath`. The next milestone wires upload handling, PDF persistence, and a viewer
            that can later support page navigation from concepts.
          </p>
          <div className="mt-8 space-y-4 rounded-2xl border border-white/10 bg-background/50 p-6 text-lg leading-8 text-on-surface">
            {knowledge.overview.map((item) => (
              <p key={item}>{item}</p>
            ))}
          </div>
        </div>
      </GlassCard>
    </AppShell>
  );
}
