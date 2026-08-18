"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ChapterDetail } from "@/lib/types";

type ChapterInternalReaderProps = {
  chapterTitle: string;
  detail: ChapterDetail;
  onClose: () => void;
};

export function ChapterInternalReader({ chapterTitle, detail, onClose }: ChapterInternalReaderProps) {
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [colWidth, setColWidth] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const columnsRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  // Effect 1: measure the wrapper's client width and store as colWidth.
  // Only needs wrapperRef — always rendered, no chicken-and-egg issue.
  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const measureWidth = () => {
      const w = wrapper.clientWidth;
      if (w > 0) setColWidth(w);
    };

    const t = setTimeout(measureWidth, 20);
    const ro = new ResizeObserver(() => { setPage(0); measureWidth(); });
    ro.observe(wrapper);
    return () => { clearTimeout(t); ro.disconnect(); };
  }, [detail]);

  // Effect 2: once colWidth is known and columns div is rendered, count pages.
  useEffect(() => {
    if (colWidth === 0) return;
    const columns = columnsRef.current;
    if (!columns) return;
    requestAnimationFrame(() => {
      if (!columnsRef.current) return;
      const total = Math.max(1, Math.round(columnsRef.current.scrollWidth / colWidth));
      setTotalPages(total);
    });
  }, [colWidth, detail]);

  const goNext = useCallback(() => setPage((p) => Math.min(p + 1, totalPages - 1)), [totalPages]);
  const goPrev = useCallback(() => setPage((p) => Math.max(p - 1, 0)), []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
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

  const isFirst = page === 0;
  const isLast = page === totalPages - 1;

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

        {/* Chapter title + dot indicators */}
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
          <p className="line-clamp-1 max-w-[200px] text-center text-xs font-bold text-on-surface-variant sm:max-w-sm md:max-w-md">
            {chapterTitle}
          </p>
          <div className="flex items-center gap-1.5">
            {totalPages <= 12 ? (
              Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i)}
                  className={`rounded-full transition-all ${i === page ? "h-2 w-5 bg-primary" : "h-2 w-2 bg-white/20 hover:bg-white/40"}`}
                />
              ))
            ) : (
              <span className="text-xs font-bold text-on-surface-variant">{page + 1} / {totalPages}</span>
            )}
          </div>
        </div>

        {/* Desktop prev / next */}
        <div className="hidden items-center gap-2 md:flex">
          <button onClick={goPrev} disabled={isFirst} className="rounded-full border border-white/10 p-2 text-on-surface-variant hover:bg-white/5 disabled:opacity-30">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <button onClick={goNext} disabled={isLast} className="rounded-full border border-white/10 p-2 text-on-surface-variant hover:bg-white/5 disabled:opacity-30">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        </div>

        {/* Mobile spacer to keep dots centred */}
        <div className="w-14 md:hidden" />
      </div>

      {/* Viewport — clips to exactly one screen-wide column */}
      <div ref={wrapperRef} className="relative flex-1 overflow-hidden">

        {/* Side nav arrows — absolutely positioned over the content */}
        <button
          onClick={goPrev}
          disabled={isFirst}
          aria-label="Previous page"
          className="absolute left-0 top-0 z-10 flex h-full w-14 items-center justify-start pl-2 text-on-surface-variant/30 transition hover:text-on-surface-variant/70 disabled:pointer-events-none disabled:opacity-0 sm:w-16 sm:pl-3"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 backdrop-blur-sm">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </span>
        </button>
        <button
          onClick={goNext}
          disabled={isLast}
          aria-label="Next page"
          className="absolute right-0 top-0 z-10 flex h-full w-14 items-center justify-end pr-2 text-on-surface-variant/30 transition hover:text-on-surface-variant/70 disabled:pointer-events-none disabled:opacity-0 sm:w-16 sm:pr-3"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 backdrop-blur-sm">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
          </span>
        </button>

        <div
          ref={columnsRef}
          className="h-full transition-transform duration-300 ease-in-out"
          style={{
            // Before measurement: use 100% so content renders visibly.
            // After measurement: switch to exact pixel width for accurate column breaks.
            columnWidth: colWidth > 0 ? `${colWidth}px` : "100%",
            columnGap: 0,
            columnFill: "auto",
            transform: colWidth > 0 ? `translateX(${-page * colWidth}px)` : undefined,
          }}
        >
          {/* Inner padding div — box-decoration-break:clone repeats padding in each column */}
          <div
            className="py-8"
            style={{
              paddingInline: "clamp(1.25rem, 5vw, 3rem)",
              boxDecorationBreak: "clone",
              WebkitBoxDecorationBreak: "clone",
            }}
          >
            <ContentFlow detail={detail} />
          </div>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <div className="flex shrink-0 items-center justify-between border-t border-white/10 px-6 py-4 md:hidden">
        <button
          onClick={goPrev}
          disabled={isFirst}
          className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2.5 text-sm font-bold text-on-surface-variant active:bg-white/5 disabled:opacity-30"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          Prev
        </button>
        <span className="text-xs font-bold text-on-surface-variant">{page + 1} / {totalPages}</span>
        <button
          onClick={goNext}
          disabled={isLast}
          className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2.5 text-sm font-bold text-on-surface-variant active:bg-white/5 disabled:opacity-30"
        >
          Next
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
      </div>
    </div>
  );
}

// Renders all chapter content as a flat flowing document.
// break-inside-avoid-column on key elements prevents them splitting mid-item.
function ContentFlow({ detail }: { detail: ChapterDetail }) {
  return (
    <div className="space-y-6 text-base leading-8 text-on-surface">
      {/* Summary */}
      {detail.summary.map((p, i) => (
        <p key={i} style={{ breakInside: "avoid-column" }}>{p}</p>
      ))}

      {/* Sections */}
      {detail.sections.map((section, si) => (
        <div key={si} className="space-y-4">
          {section.title && (
            <h3
              className="text-xs font-bold uppercase tracking-[0.2em] text-secondary"
              style={{ breakAfter: "avoid-column" }}
            >
              {section.title}
            </h3>
          )}
          {section.kind === "prose" && section.paragraphs.map((p, i) => (
            <p key={i} style={{ breakInside: "avoid-column" }}>{p}</p>
          ))}
          {section.kind === "list" && section.items.map((item, i) => (
            <div key={i} className="border-b border-white/10 pb-4 last:border-0" style={{ breakInside: "avoid-column" }}>
              {item.label && <span className="block font-bold text-on-background">{item.label}</span>}
              <span className="text-on-surface-variant">{item.explanation}</span>
            </div>
          ))}
          {section.kind === "steps" && section.items.map((item, i) => (
            <div key={i} className="flex gap-4 border-b border-white/10 pb-4 last:border-0" style={{ breakInside: "avoid-column" }}>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">{i + 1}</span>
              <div>
                {item.step && <span className="block font-bold text-on-background">{item.step}</span>}
                {item.explanation && <p className="mt-1 text-sm leading-6 text-on-surface-variant">{item.explanation}</p>}
              </div>
            </div>
          ))}
        </div>
      ))}

      {/* Standout example */}
      {detail.standoutExample && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4" style={{ breakInside: "avoid-column" }}>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-secondary">{detail.standoutExample.label}</h3>
          <p className="text-sm leading-7 text-on-surface-variant">{detail.standoutExample.story}</p>
        </div>
      )}

      {/* Action items */}
      {detail.actionItems && detail.actionItems.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-secondary" style={{ breakAfter: "avoid-column" }}>
            Action Items
          </h3>
          {detail.actionItems.map((item, i) => (
            <div key={i} className="flex gap-4" style={{ breakInside: "avoid-column" }}>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">{i + 1}</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
