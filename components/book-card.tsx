import Link from "next/link";
import { BookCover } from "@/components/book-cover";
import { GlassCard } from "@/components/glass-card";
import { ProgressBar } from "@/components/progress-bar";
import { routes } from "@/lib/routes";
import type { Book } from "@/lib/types";

type BookCardProps = {
  book: Book;
};

export function BookCard({ book }: BookCardProps) {
  return (
    <Link href={routes.book(book.slug)} className="group block min-w-[220px]">
      <GlassCard className="overflow-hidden transition duration-300 group-hover:scale-[1.02] group-hover:border-primary/40 group-hover:shadow-glow">
        <BookCover title={book.title} author={book.author} className="rounded-b-none border-0" />
        <div className="space-y-3 p-4">
          <div>
            <h3 className="font-display text-2xl font-bold leading-tight text-on-background">{book.title}</h3>
            <p className="mt-1 text-sm text-on-surface-variant">{book.author}</p>
          </div>
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
            <span>{book.readingTime}</span>
            <span className="text-secondary">{book.status === "ready" ? "Knowledge Ready" : book.status}</span>
          </div>
          <ProgressBar value={book.progress} />
        </div>
      </GlassCard>
    </Link>
  );
}
