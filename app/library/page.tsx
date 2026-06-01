import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { BookCard } from "@/components/book-card";
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
    </AppShell>
  );
}
