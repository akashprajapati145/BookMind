import Link from "next/link";
import { BookCover } from "@/components/book-cover";
import { GlassCard } from "@/components/glass-card";
import { ProgressBar } from "@/components/progress-bar";
import { routes } from "@/lib/routes";
import type { Book } from "@/lib/types";

type BookCardProps = {
  book: Book;
};

const statusLabels: Record<Book["status"], string> = {
  ready: "Knowledge Ready",
  indexed: "Index Ready",
  processing: "Processing",
  extracted: "Text Extracted",
  failed: "Failed"
};

export function BookCard({ book }: BookCardProps) {
  return (
    <Link href={routes.book(book.slug)} className="group block h-full min-w-[220px]">
      <GlassCard className="flex h-full flex-col overflow-hidden transition duration-300 group-hover:scale-[1.02] group-hover:border-primary/40 group-hover:shadow-glow">
        <BookCover title={book.title} author={book.author} className="rounded-b-none border-0" />
        <div className="flex flex-1 flex-col justify-between gap-3 p-4">
          <div>
            <h3 className="line-clamp-2 break-words font-display text-2xl font-bold leading-tight text-on-background">{book.title}</h3>
            <p className="mt-1 line-clamp-1 break-words text-sm text-on-surface-variant">{book.author}</p>
          </div>
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
              <span>{book.readingTime}</span>
              <span className="text-secondary">{statusLabels[book.status]}</span>
            </div>
            <ProgressBar value={book.progress} />
          </div>
        </div>
      </GlassCard>
    </Link>
  );
}
