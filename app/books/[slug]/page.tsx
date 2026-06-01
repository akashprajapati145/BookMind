import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { BookHero } from "@/components/book-hero";
import { DepthCard } from "@/components/depth-card";
import { KnowledgeSection } from "@/components/knowledge-section";
import { getKnowledgePackage } from "@/lib/books";
import { routes } from "@/lib/routes";

type BookPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function BookPage({ params }: BookPageProps) {
  const { slug } = await params;
  const knowledge = getKnowledgePackage(slug);

  if (!knowledge) {
    notFound();
  }

  const navItems = [
    ["Overview", routes.book(slug)],
    ["Journey", routes.journey(slug)],
    ["Chapters", routes.chapters(slug)],
    ["Concepts", routes.concepts(slug)],
    ["Examples", routes.examples(slug)],
    ["Actions", routes.actions(slug)],
    ["PDF", routes.reader(slug)]
  ];

  return (
    <AppShell>
      <BookHero
        knowledge={knowledge}
        actions={
          <>
            <Link href={routes.learn(slug, "1")} className="rounded-full bg-primary px-5 py-3 font-bold text-on-primary">
              Start Learning
            </Link>
            <Link href={routes.reader(slug)} className="glass rounded-full px-5 py-3 font-bold">
              Read Source
            </Link>
          </>
        }
      />

      <div className="mb-8 flex flex-wrap gap-2">
        {navItems.map(([label, href]) => (
          <Link key={label} href={href} className="glass rounded-full px-4 py-2 text-sm font-bold text-on-surface-variant hover:text-on-background">
            {label}
          </Link>
        ))}
      </div>

      <section className="grid gap-5 md:grid-cols-4">
        {knowledge.learningModes.map((mode) => (
          <DepthCard key={mode.slug} slug={slug} mode={mode} />
        ))}
      </section>

      <section className="mt-10 grid gap-5 lg:grid-cols-[1fr_0.8fr]">
        <KnowledgeSection eyebrow="Overview" title="What this book teaches">
          <div className="space-y-4 leading-7">
            {knowledge.overview.map((item) => (
              <p key={item}>{item}</p>
            ))}
          </div>
        </KnowledgeSection>
        <KnowledgeSection eyebrow="Framework" title="Core operating model">
          <p className="leading-7">{knowledge.framework}</p>
        </KnowledgeSection>
      </section>
    </AppShell>
  );
}
