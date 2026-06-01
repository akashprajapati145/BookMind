import { BookCover } from "@/components/book-cover";
import { GlassCard } from "@/components/glass-card";
import { ProgressBar } from "@/components/progress-bar";
import type { KnowledgePackage } from "@/lib/types";

type BookHeroProps = {
  knowledge: KnowledgePackage;
  actions?: React.ReactNode;
};

export function BookHero({ knowledge, actions }: BookHeroProps) {
  const { book } = knowledge;

  return (
    <GlassCard className="mb-10 overflow-hidden">
      <div className="grid gap-8 p-5 md:grid-cols-[260px_1fr] md:p-8">
        <BookCover title={book.title} author={book.author} />
        <div className="flex flex-col justify-center">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-secondary">{book.category}</p>
          <h1 className="font-display text-5xl font-bold leading-none text-on-background md:text-7xl">{book.title}</h1>
          <p className="mt-4 text-lg text-on-surface-variant">by {book.author}</p>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-on-surface">{knowledge.thesis}</p>
          <div className="mt-8 max-w-md space-y-3">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-[0.18em] text-on-surface-variant">
              <span>{book.progress}% complete</span>
              <span>{book.readingTime}</span>
            </div>
            <ProgressBar value={book.progress} />
          </div>
          {actions ? <div className="mt-8 flex flex-wrap gap-3">{actions}</div> : null}
        </div>
      </div>
    </GlassCard>
  );
}
