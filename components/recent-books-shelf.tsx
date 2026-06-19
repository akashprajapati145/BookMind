"use client";

import Link from "next/link";
import { useRef } from "react";
import { BookCard } from "@/components/book-card";
import { routes } from "@/lib/routes";
import type { Book } from "@/lib/types";

type RecentBooksShelfProps = {
  books: Book[];
};

const MAX_VISIBLE = 8;

export function RecentBooksShelf({ books }: RecentBooksShelfProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const hasMore = books.length > MAX_VISIBLE;
  const visibleBooks = hasMore ? books.slice(0, MAX_VISIBLE) : books;
  const remaining = books.length - MAX_VISIBLE;

  function scroll(direction: "left" | "right") {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.8;
    el.scrollBy({ left: direction === "left" ? -amount : amount, behavior: "smooth" });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => scroll("left")}
        aria-label="Scroll left"
        className="absolute left-0 top-1/2 z-10 hidden -translate-x-3 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-surface/90 p-2 text-on-background shadow-lg backdrop-blur transition hover:border-primary/40 md:flex"
      >
        <ChevronIcon direction="left" />
      </button>

      <div ref={scrollRef} className="hide-scrollbar flex gap-5 overflow-x-auto scroll-smooth pb-4">
        {visibleBooks.map((book) => (
          <div key={book.slug} className="w-[220px] flex-shrink-0">
            <BookCard book={book} />
          </div>
        ))}

        {hasMore ? (
          <Link
            href={routes.library}
            className="glass flex w-[220px] flex-shrink-0 flex-col items-center justify-center gap-3 rounded-2xl p-4 text-center transition hover:scale-[1.02] hover:border-primary/40 hover:shadow-glow"
          >
            <span className="font-display text-3xl font-bold text-primary">+{remaining}</span>
            <span className="text-sm font-bold text-on-surface-variant">View Full Library</span>
          </Link>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => scroll("right")}
        aria-label="Scroll right"
        className="absolute right-0 top-1/2 z-10 hidden -translate-y-1/2 translate-x-3 items-center justify-center rounded-full border border-white/10 bg-surface/90 p-2 text-on-background shadow-lg backdrop-blur transition hover:border-primary/40 md:flex"
      >
        <ChevronIcon direction="right" />
      </button>
    </div>
  );
}

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {direction === "left" ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 18l6-6-6-6" />}
    </svg>
  );
}
