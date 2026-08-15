"use client";

import { useChapterProgress } from "@/hooks/use-chapter-progress";

type ChaptersProgressBarProps = {
  slug: string;
  total: number;
  chapterTitles: string[];
};

export function ChaptersProgressBar({ slug, total, chapterTitles }: ChaptersProgressBarProps) {
  const { done } = useChapterProgress(slug);
  const count = chapterTitles.filter((t) => done.has(t)).length;
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;

  if (count === 0) return null;

  return (
    <div className="mt-4 flex items-center gap-3">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="shrink-0 text-xs font-bold text-on-surface-variant">
        {count}/{total} chapters done
      </span>
    </div>
  );
}
