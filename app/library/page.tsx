import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { BookCard } from "@/components/book-card";
import { GenerateKnowledgeButton } from "@/components/generate-knowledge-button";
import { GlassCard } from "@/components/glass-card";
import { PageHeader } from "@/components/page-header";
import { getBooks } from "@/lib/books";
import { routes } from "@/lib/routes";

export default function LibraryPage() {
  const books = getBooks();

  return (
    <AppShell>
      <PageHeader
        eyebrow="Library"
        title="Knowledge ready books"
        description="Every uploaded book becomes a permanent package of modes, concepts, examples, chapters, actions, and source material."
        action={
          <Link href={routes.upload} className="rounded-full bg-primary px-5 py-3 font-bold text-on-primary">
            Upload Book
          </Link>
        }
      />

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {books.map((book) => (
          <BookCard key={book.slug} book={book} />
        ))}
      </div>

      {books.some((book) => book.status === "extracted") ? (
        <GlassCard className="mt-8 p-5">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-secondary">Ready For Gemini</p>
          <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <h2 className="font-display text-3xl font-bold text-on-background">Generate extracted books</h2>
              <p className="mt-2 text-on-surface-variant">Turn extracted source text into BookMind learning modes, concepts, examples, chapters, and actions.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {books
                .filter((book) => book.status === "extracted")
                .map((book) => (
                  <GenerateKnowledgeButton key={book.slug} slug={book.slug} label={`Generate ${book.title}`} />
                ))}
            </div>
          </div>
        </GlassCard>
      ) : null}
    </AppShell>
  );
}
