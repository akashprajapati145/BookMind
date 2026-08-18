"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChapterDetail, ChapterSection } from "@/lib/types";

type PageEntry = {
  title: string;
  detail: ChapterDetail | undefined;
};

type ChapterPageReaderProps = {
  pages: PageEntry[];
  initialPage?: number;
  onClose: () => void;
};

export function ChapterPageReader({ pages, initialPage = 0, onClose }: ChapterPageReaderProps) {
  const [current, setCurrent] = useState(initialPage);
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

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") goNext();
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") goPrev();
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goNext, goPrev, onClose]);

  // Touch swipe
  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = touchStartX.current - e.changedTouches[0].clientX;
    const dy = touchStartY.current - e.changedTouches[0].clientY;
    // Only swipe if horizontal movement is dominant (not a scroll)
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      if (dx > 0) goNext();
      else goPrev();
    }
    touchStartX.current = null;
    touchStartY.current = null;
  }

  const page = pages[current];
  const isFirst = current === 0;
  const isLast = current === pages.length - 1;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-background"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3 md:px-8">
        <button
          onClick={onClose}
          className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-sm font-bold text-on-surface-variant hover:bg-white/5"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
          <span className="hidden sm:inline">Exit</span>
        </button>

        {/* Page indicator */}
        <div className="flex items-center gap-3">
          {/* Dot indicators — visible on all screens, max 12 dots */}
          {pages.length <= 12 && (
            <div className="flex gap-1">
              {pages.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setCurrent(i); contentRef.current?.scrollTo({ top: 0, behavior: "instant" }); }}
                  className={`rounded-full transition-all ${
                    i === current
                      ? "h-2 w-5 bg-primary"
                      : "h-2 w-2 bg-white/20 hover:bg-white/40"
                  }`}
                />
              ))}
            </div>
          )}
          <span className="text-xs font-bold text-on-surface-variant">
            {current + 1} / {pages.length}
          </span>
        </div>

        {/* Desktop prev/next in top bar */}
        <div className="hidden items-center gap-2 md:flex">
          <button
            onClick={goPrev}
            disabled={isFirst}
            className="rounded-full border border-white/10 p-2 text-on-surface-variant transition hover:bg-white/5 disabled:opacity-30"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            onClick={goNext}
            disabled={isLast}
            className="rounded-full border border-white/10 p-2 text-on-surface-variant transition hover:bg-white/5 disabled:opacity-30"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        {/* Mobile: empty spacer to keep indicator centered */}
        <div className="w-16 md:hidden" />
      </div>

      {/* Content area — my-auto centers short chapters, long ones still scroll */}
      <div className="relative flex-1 overflow-hidden">

        {/* Side nav arrows */}
        <button
          onClick={goPrev}
          disabled={isFirst}
          aria-label="Previous chapter"
          className="absolute left-0 top-0 z-10 flex h-full w-14 items-center justify-start pl-2 text-on-surface-variant/30 transition hover:text-on-surface-variant/70 disabled:pointer-events-none disabled:opacity-0 sm:w-16 sm:pl-3"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 backdrop-blur-sm">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </span>
        </button>
        <button
          onClick={goNext}
          disabled={isLast}
          aria-label="Next chapter"
          className="absolute right-0 top-0 z-10 flex h-full w-14 items-center justify-end pr-2 text-on-surface-variant/30 transition hover:text-on-surface-variant/70 disabled:pointer-events-none disabled:opacity-0 sm:w-16 sm:pr-3"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 backdrop-blur-sm">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
          </span>
        </button>

        <div ref={contentRef} className="flex h-full flex-col overflow-y-auto">
        <div className="mx-auto my-auto w-full max-w-2xl px-5 py-8 md:px-8">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-secondary">
            Chapter {current + 1}
          </p>
          <h2 className="mb-8 font-display text-3xl font-bold leading-tight text-on-background md:text-4xl">
            {page.title}
          </h2>

          {page.detail ? (
            <PageContent detail={page.detail} />
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
              <p className="text-on-surface-variant">
                This chapter hasn&apos;t been generated yet.
              </p>
              <p className="mt-2 text-sm text-on-surface-variant opacity-60">
                Go back to scroll view and load this chapter first.
              </p>
            </div>
          )}
        </div>
        </div>{/* end contentRef scroll div */}
      </div>{/* end relative wrapper */}

      {/* Mobile bottom nav */}
      <div className="flex shrink-0 items-center justify-between border-t border-white/10 px-6 py-4 md:hidden">
        <button
          onClick={goPrev}
          disabled={isFirst}
          className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2.5 text-sm font-bold text-on-surface-variant transition active:bg-white/5 disabled:opacity-30"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Prev
        </button>

        <span className="text-xs text-on-surface-variant">{page.title.length > 24 ? page.title.slice(0, 24) + "…" : page.title}</span>

        <button
          onClick={goNext}
          disabled={isLast}
          className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2.5 text-sm font-bold text-on-surface-variant transition active:bg-white/5 disabled:opacity-30"
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

function PageContent({ detail }: { detail: ChapterDetail }) {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        {detail.summary.map((p, i) => (
          <p key={i} className="text-base leading-8 text-on-surface">{p}</p>
        ))}
      </div>

      {detail.sections.map((section, i) => (
        <SectionView key={i} section={section} />
      ))}

      {detail.standoutExample && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-secondary">
            {detail.standoutExample.label}
          </h3>
          <p className="text-sm leading-7 text-on-surface-variant">{detail.standoutExample.story}</p>
        </div>
      )}

      {detail.actionItems && detail.actionItems.length > 0 && (
        <div>
          <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-secondary">Action Items</h3>
          <ul className="space-y-3">
            {detail.actionItems.map((item, i) => (
              <li key={i} className="flex gap-3 text-sm leading-6">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">{i + 1}</span>
                <span className="text-on-surface-variant">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function SectionView({ section }: { section: ChapterSection }) {
  if (section.kind === "prose") {
    return (
      <div>
        {section.title && <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-secondary">{section.title}</h3>}
        <div className="space-y-4">
          {section.paragraphs.map((p, i) => (
            <p key={i} className="text-base leading-8 text-on-surface">{p}</p>
          ))}
        </div>
      </div>
    );
  }

  if (section.kind === "list") {
    return (
      <div>
        {section.title && <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-secondary">{section.title}</h3>}
        <ul className="space-y-4">
          {section.items.map((item, i) => (
            <li key={i} className="border-b border-white/10 pb-4 last:border-0">
              {item.label && <span className="block text-sm font-bold text-on-background">{item.label}</span>}
              <span className="text-sm leading-7 text-on-surface-variant">{item.explanation}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div>
      {section.title && <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-secondary">{section.title}</h3>}
      <ol className="space-y-4">
        {section.items.map((item, i) => (
          <li key={i} className="flex gap-3 border-b border-white/10 pb-4 last:border-0">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-on-background">{i + 1}</span>
            <div>
              {item.step && <span className="block text-sm font-bold text-on-background">{item.step}</span>}
              {item.explanation && <p className="mt-1 text-sm leading-6 text-on-surface-variant">{item.explanation}</p>}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
