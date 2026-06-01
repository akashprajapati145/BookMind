import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { BookCard } from "@/components/book-card";
import { DepthCard } from "@/components/depth-card";
import { GlassCard } from "@/components/glass-card";
import { PageHeader } from "@/components/page-header";
import { getAllKnowledgePackages, getBooks } from "@/lib/books";
import { routes } from "@/lib/routes";

export default function HomePage() {
  const books = getBooks();
  const featured = getAllKnowledgePackages()[0];

  return (
    <AppShell>
      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="flex min-h-[520px] flex-col justify-end rounded-3xl border border-white/10 bg-[linear-gradient(135deg,rgba(192,193,255,0.18),rgba(2,6,23,0.2)),url('/assets/home-screen.png')] bg-cover bg-center p-6 shadow-2xl md:p-10">
          <div className="max-w-3xl">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.22em] text-secondary">BookMind</p>
            <h1 className="font-display text-5xl font-bold leading-none text-white md:text-7xl">
              Learn any book in the time you have
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-200">
              Upload a book and turn it into a structured knowledge experience with fast learning modes,
              concepts, examples, chapters, actions, and the source text.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={routes.upload} className="rounded-full bg-primary px-5 py-3 font-bold text-on-primary">
                Upload Book
              </Link>
              <Link href={routes.library} className="glass rounded-full px-5 py-3 font-bold text-on-background">
                Browse Library
              </Link>
            </div>
          </div>
        </div>

        {featured ? (
          <GlassCard className="p-6">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-secondary">Continue Learning</p>
            <h2 className="mt-4 font-display text-4xl font-bold text-on-background">{featured.book.title}</h2>
            <p className="mt-4 text-base leading-7 text-on-surface-variant">{featured.thesis}</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {featured.learningModes.slice(0, 4).map((mode) => (
                <DepthCard key={mode.slug} slug={featured.book.slug} mode={mode} />
              ))}
            </div>
          </GlassCard>
        ) : null}
      </section>

      <section className="mt-12">
        <PageHeader
          eyebrow="Recently Added"
          title="Your knowledge library"
          description="Streaming-style shelves for books that have been converted into permanent knowledge packages."
        />
        <div className="hide-scrollbar flex gap-5 overflow-x-auto pb-4">
          {books.map((book) => (
            <BookCard key={book.slug} book={book} />
          ))}
        </div>
      </section>
    </AppShell>
  );
}
