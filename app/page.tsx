import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { BookCover } from "@/components/book-cover";
import { GlassCard } from "@/components/glass-card";
import { PageHeader } from "@/components/page-header";
import { RecentBooksShelf } from "@/components/recent-books-shelf";
import { getBookIndex, getBooks, getKnowledgePackage } from "@/lib/books";
import { routes } from "@/lib/routes";

function getFeaturedBook(books: ReturnType<typeof getBooks>) {
  // Skip books still stuck in the placeholder "extracted" state — they have no real
  // thesis yet, only the stale copy written at upload time before any analysis ran.
  const candidate = books.find((book) => book.status === "indexed" || book.status === "ready");
  if (!candidate) return null;

  const bookIndex = getBookIndex(candidate.slug);
  if (bookIndex) {
    return { slug: candidate.slug, title: candidate.title, author: candidate.author, thesis: bookIndex.thesis };
  }

  const knowledge = getKnowledgePackage(candidate.slug);
  if (knowledge) {
    return { slug: candidate.slug, title: candidate.title, author: candidate.author, thesis: knowledge.thesis };
  }

  return null;
}

export default function HomePage() {
  const books = getBooks();
  const featured = getFeaturedBook(books);

  return (
    <AppShell>
      <div className="flex min-h-[420px] flex-col justify-end rounded-3xl border border-white/10 bg-[linear-gradient(135deg,rgba(192,193,255,0.18),rgba(2,6,23,0.2)),url('/assets/home-screen.png')] bg-cover bg-center p-6 shadow-2xl md:p-10">
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
        <GlassCard className="mt-6 flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
          <div className="w-20 flex-shrink-0 sm:w-24">
            <BookCover title={featured.title} author={featured.author} compact />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-secondary">Continue Reading</p>
            <h2 className="mt-1 font-display text-2xl font-bold text-on-background">{featured.title}</h2>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-on-surface-variant">{featured.thesis}</p>
          </div>
          <Link
            href={routes.book(featured.slug)}
            className="flex-shrink-0 rounded-full bg-primary px-5 py-3 font-bold text-on-primary"
          >
            Continue Reading
          </Link>
        </GlassCard>
      ) : null}

      <section className="mt-12">
        <PageHeader
          eyebrow="Recently Added"
          title="Your knowledge library"
          description="Streaming-style shelves for books that have been converted into permanent knowledge packages."
        />
        <RecentBooksShelf books={books} />
      </section>
    </AppShell>
  );
}
