"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChapterDetail, ChapterSection } from "@/lib/types";

type Page =
  | { kind: "summary"; paragraphs: string[] }
  | { kind: "section"; section: ChapterSection; index: number }
  | { kind: "example"; label: string; story: string }
  | { kind: "actions"; items: string[] };

function buildPages(detail: ChapterDetail): Page[] {
  const pages: Page[] = [];

  if (detail.summary.length > 0) {
    pages.push({ kind: "summary", paragraphs: detail.summary });
  }

  detail.sections.forEach((section, index) => {
    pages.push({ kind: "section", section, index });
  });

  if (detail.standoutExample) {
    pages.push({ kind: "example", label: detail.standoutExample.label, story: detail.standoutExample.story });
  }

  if (detail.actionItems && detail.actionItems.length > 0) {
    pages.push({ kind: "actions", items: detail.actionItems });
  }

  return pages;
}

type ChapterInternalReaderProps = {
  chapterTitle: string;
  detail: ChapterDetail;
  onClose: () => void;
};

export function ChapterInternalReader({ chapterTitle, detail, onClose }: ChapterInternalReaderProps) {
  const pages = buildPages(detail);
  const [current, setCurrent] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const goNext = useCallback(() => {
    setCurrent((p) => Math.min(p + 1, pages.length - 1));
    contentRef.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [pages.length]);

  const goPrev = useCallback(() => {
    setCurrent((p) => Math.max(p - 1, 0));
    contentRef.current?.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") goNext();
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") goPrev();
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goNext, goPrev, onClose]);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = touchStartX.current - e.changedTouches[0].clientX;
    const dy = touchStartY.current - e.changedTouches[0].clientY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      if (dx > 0) goNext(); else goPrev();
    }
    touchStartX.current = null;
    touchStartY.current = null;
  }

  const isFirst = current === 0;
  const isLast = current === pages.length - 1;
  const page = pages[current];

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-background"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top bar */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3 md:px-8">
        <button
          onClick={onClose}
          className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-sm font-bold text-on-surface-variant hover:bg-white/5"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
          <span className="hidden sm:inline">Close</span>
        </button>

        {/* Chapter title + page dots */}
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
          <p className="line-clamp-1 max-w-xs text-center text-xs font-bold text-on-surface-variant md:max-w-md">
            {chapterTitle}
          </p>
          <div className="flex items-center gap-1.5">
            {pages.map((_, i) => (
              <button
                key={i}
                onClick={() => { setCurrent(i); contentRef.current?.scrollTo({ top: 0, behavior: "instant" }); }}
                className={`rounded-full transition-all ${
                  i === current ? "h-2 w-5 bg-primary" : "h-2 w-2 bg-white/20 hover:bg-white/40"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Desktop prev/next */}
        <div className="hidden items-center gap-2 md:flex">
          <button onClick={goPrev} disabled={isFirst} className="rounded-full border border-white/10 p-2 text-on-surface-variant hover:bg-white/5 disabled:opacity-30">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button onClick={goNext} disabled={isLast} className="rounded-full border border-white/10 p-2 text-on-surface-variant hover:bg-white/5 disabled:opacity-30">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        {/* Mobile spacer */}
        <div className="w-12 md:hidden" />
      </div>

      {/* Content */}
      <div ref={contentRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-5 py-8 md:px-8 md:py-12">
          <PageView page={page} />
        </div>
      </div>

      {/* Mobile bottom nav */}
      <div className="flex shrink-0 items-center justify-between border-t border-white/10 px-6 py-4 md:hidden">
        <button
          onClick={goPrev}
          disabled={isFirst}
          className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2.5 text-sm font-bold text-on-surface-variant active:bg-white/5 disabled:opacity-30"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Prev
        </button>
        <span className="text-xs font-bold text-on-surface-variant">{current + 1} / {pages.length}</span>
        <button
          onClick={goNext}
          disabled={isLast}
          className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2.5 text-sm font-bold text-on-surface-variant active:bg-white/5 disabled:opacity-30"
        >
          Next
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function PageView({ page }: { page: Page }) {
  if (page.kind === "summary") {
    return (
      <div className="space-y-5">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-secondary">Summary</p>
        {page.paragraphs.map((p, i) => (
          <p key={i} className="text-base leading-8 text-on-surface">{p}</p>
        ))}
      </div>
    );
  }

  if (page.kind === "section") {
    const { section } = page;
    return (
      <div className="space-y-5">
        {section.title && (
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-secondary">{section.title}</p>
        )}
        {section.kind === "prose" && (
          <div className="space-y-4">
            {section.paragraphs.map((p, i) => (
              <p key={i} className="text-base leading-8 text-on-surface">{p}</p>
            ))}
          </div>
        )}
        {section.kind === "list" && (
          <ul className="space-y-4">
            {section.items.map((item, i) => (
              <li key={i} className="border-b border-white/10 pb-4 last:border-0">
                {item.label && <span className="block font-bold text-on-background">{item.label}</span>}
                <span className="text-sm leading-7 text-on-surface-variant">{item.explanation}</span>
              </li>
            ))}
          </ul>
        )}
        {section.kind === "steps" && (
          <ol className="space-y-4">
            {section.items.map((item, i) => (
              <li key={i} className="flex gap-4 border-b border-white/10 pb-4 last:border-0">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">{i + 1}</span>
                <div>
                  {item.step && <span className="block font-bold text-on-background">{item.step}</span>}
                  {item.explanation && <p className="mt-1 text-sm leading-6 text-on-surface-variant">{item.explanation}</p>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    );
  }

  if (page.kind === "example") {
    return (
      <div className="space-y-5">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-secondary">{page.label}</p>
        <p className="text-base leading-8 text-on-surface">{page.story}</p>
      </div>
    );
  }

  if (page.kind === "actions") {
    return (
      <div className="space-y-5">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-secondary">Action Items</p>
        <ul className="space-y-4">
          {page.items.map((item, i) => (
            <li key={i} className="flex gap-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">{i + 1}</span>
              <span className="text-base leading-7 text-on-surface">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return null;
}
