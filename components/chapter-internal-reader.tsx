"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChapterDetail, ChapterSection } from "@/lib/types";

type ChapterInternalReaderProps = {
  chapterTitle: string;
  detail: ChapterDetail;
  onClose: () => void;
};

// ── Page model ───────────────────────────────────────────────────────────────

type SummaryPage   = { kind: "summary";  paragraphs: string[] };
type ProsePage     = { kind: "prose";    title: string; paragraphs: string[] };
type ListPage      = { kind: "list";     title: string; items: Array<{ label: string; explanation: string }> };
type StepsPage     = { kind: "steps";    title: string; items: Array<{ step: string; explanation: string }> };
type ExamplePage   = { kind: "example";  label: string; story: string };
type ActionsPage   = { kind: "actions";  items: string[]; startIndex: number };
type Page = SummaryPage | ProsePage | ListPage | StepsPage | ExamplePage | ActionsPage;

const PROSE_PER_PAGE  = 3;
const LIST_PER_PAGE   = 5;
const STEPS_PER_PAGE  = 4;
const ACTION_PER_PAGE = 5;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function buildPages(detail: ChapterDetail): Page[] {
  const pages: Page[] = [];

  // Summary — up to PROSE_PER_PAGE paragraphs per page
  chunk(detail.summary, PROSE_PER_PAGE).forEach((paragraphs) =>
    pages.push({ kind: "summary", paragraphs })
  );

  // Sections
  detail.sections.forEach((section) => {
    if (section.kind === "prose") {
      chunk(section.paragraphs, PROSE_PER_PAGE).forEach((paragraphs) =>
        pages.push({ kind: "prose", title: section.title, paragraphs })
      );
    } else if (section.kind === "list") {
      chunk(section.items, LIST_PER_PAGE).forEach((items) =>
        pages.push({ kind: "list", title: section.title, items })
      );
    } else {
      chunk(section.items, STEPS_PER_PAGE).forEach((items) =>
        pages.push({ kind: "steps", title: section.title, items })
      );
    }
  });

  // Standout example
  if (detail.standoutExample) {
    pages.push({ kind: "example", ...detail.standoutExample });
  }

  // Action items
  if (detail.actionItems && detail.actionItems.length > 0) {
    chunk(detail.actionItems, ACTION_PER_PAGE).forEach((items, ci) =>
      pages.push({ kind: "actions", items, startIndex: ci * ACTION_PER_PAGE })
    );
  }

  return pages;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ChapterInternalReader({ chapterTitle, detail, onClose }: ChapterInternalReaderProps) {
  const pages = buildPages(detail);
  const [page, setPage] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const totalPages = pages.length;
  const isFirst = page === 0;
  const isLast  = page === totalPages - 1;

  const goNext = useCallback(() => setPage((p) => Math.min(p + 1, totalPages - 1)), [totalPages]);
  const goPrev = useCallback(() => setPage((p) => Math.max(p - 1, 0)), []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft")  goPrev();
      if (e.key === "Escape")     onClose();
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

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-background"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Top bar ── */}
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

        {/* Title + dot indicators */}
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

        <div className="w-14 md:hidden" />
      </div>

      {/* ── Sliding page strip ── */}
      <div className="relative flex-1 overflow-hidden">

        {/* Side arrows floating over the viewport */}
        <button
          onClick={goPrev}
          disabled={isFirst}
          aria-label="Previous page"
          className="absolute left-0 top-0 z-10 flex h-full w-10 items-center justify-center text-on-surface-variant/40 transition hover:text-on-surface-variant/80 disabled:pointer-events-none disabled:opacity-0 sm:w-14"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </span>
        </button>
        <button
          onClick={goNext}
          disabled={isLast}
          aria-label="Next page"
          className="absolute right-0 top-0 z-10 flex h-full w-10 items-center justify-center text-on-surface-variant/40 transition hover:text-on-surface-variant/80 disabled:pointer-events-none disabled:opacity-0 sm:w-14"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
          </span>
        </button>

        {/* The strip — all pages side-by-side, slide via transform */}
        <div
          className="flex h-full transition-transform duration-300 ease-in-out"
          style={{ transform: `translateX(-${page * 100}%)` }}
        >
          {pages.map((p, i) => (
            <div key={i} className="h-full w-full shrink-0 overflow-y-auto">
              <div className="mx-auto w-full max-w-2xl px-5 py-8 md:px-10">
                <PageView p={p} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Mobile bottom nav ── */}
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

// ── Page renderer ─────────────────────────────────────────────────────────────

function PageView({ p }: { p: Page }) {
  if (p.kind === "summary") {
    return (
      <div className="space-y-4 text-base leading-8 text-on-surface">
        {p.paragraphs.map((para, i) => <p key={i}>{para}</p>)}
      </div>
    );
  }

  if (p.kind === "prose") {
    return (
      <div className="space-y-4">
        {p.title && <SectionLabel>{p.title}</SectionLabel>}
        <div className="space-y-4 text-base leading-8 text-on-surface">
          {p.paragraphs.map((para, i) => <p key={i}>{para}</p>)}
        </div>
      </div>
    );
  }

  if (p.kind === "list") {
    return (
      <div className="space-y-4">
        {p.title && <SectionLabel>{p.title}</SectionLabel>}
        <ul className="space-y-4">
          {p.items.map((item, i) => (
            <li key={i} className="border-b border-white/10 pb-4 last:border-0">
              {item.label && <span className="block font-bold text-on-background">{item.label}</span>}
              <span className="text-sm leading-7 text-on-surface-variant">{item.explanation}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (p.kind === "steps") {
    return (
      <div className="space-y-4">
        {p.title && <SectionLabel>{p.title}</SectionLabel>}
        <ol className="space-y-4">
          {p.items.map((item, i) => (
            <li key={i} className="flex gap-4 border-b border-white/10 pb-4 last:border-0">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">
                {i + 1}
              </span>
              <div>
                {item.step && <span className="block font-bold text-on-background">{item.step}</span>}
                {item.explanation && <p className="mt-1 text-sm leading-6 text-on-surface-variant">{item.explanation}</p>}
              </div>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  if (p.kind === "example") {
    return (
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
        <SectionLabel>{p.label}</SectionLabel>
        <p className="mt-3 text-sm leading-7 text-on-surface-variant">{p.story}</p>
      </div>
    );
  }

  // actions
  return (
    <div className="space-y-4">
      <SectionLabel>Action Items</SectionLabel>
      <ol className="space-y-4">
        {p.items.map((item, i) => (
          <li key={i} className="flex gap-4">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">
              {p.startIndex + i + 1}
            </span>
            <span className="text-sm leading-7 text-on-surface-variant">{item}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-secondary">{children}</h3>
  );
}
