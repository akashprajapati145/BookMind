"use client";

import { useEffect, useRef, useState } from "react";

type TocEntry = {
  title: string;
  slug: string;
};

type ChapterTocSidebarProps = {
  entries: TocEntry[];
  done: Set<string>;
};

export function ChapterTocSidebar({ entries, done }: ChapterTocSidebarProps) {
  const [open, setOpen] = useState(false);
  const [activeSlug, setActiveSlug] = useState<string>("");
  const drawerRef = useRef<HTMLDivElement>(null);

  // Highlight the chapter currently in view
  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    entries.forEach(({ slug }) => {
      const el = document.getElementById(`chapter-${slug}`);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveSlug(slug); },
        { rootMargin: "-30% 0px -60% 0px" }
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, [entries]);

  // Close drawer on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  function scrollTo(slug: string) {
    document.getElementById(`chapter-${slug}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setOpen(false);
  }

  const TocList = () => (
    <nav className="space-y-1">
      {entries.map(({ title, slug }) => {
        const isActive = activeSlug === slug;
        const isDone = done.has(title);
        return (
          <button
            key={slug}
            onClick={() => scrollTo(slug)}
            className={`flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
              isActive
                ? "bg-primary/20 font-semibold text-primary"
                : "text-on-surface-variant hover:bg-white/5 hover:text-on-background"
            }`}
          >
            <span className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border text-[10px] flex items-center justify-center ${
              isDone ? "border-primary bg-primary text-on-primary" : "border-white/20"
            }`}>
              {isDone ? "✓" : ""}
            </span>
            <span className="line-clamp-2 leading-5">{title}</span>
          </button>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 left-4 z-40 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-bold text-on-primary shadow-lg lg:hidden"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="15" y2="18" />
        </svg>
        Contents
      </button>

      {/* Mobile drawer overlay */}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 lg:hidden" aria-hidden="true" />
      )}

      {/* Mobile drawer */}
      <div
        ref={drawerRef}
        className={`fixed left-0 top-0 z-50 h-full w-72 overflow-y-auto bg-background border-r border-white/10 p-5 transition-transform duration-300 lg:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-on-surface-variant">Contents</h2>
          <button
            onClick={() => setOpen(false)}
            className="rounded-full p-1.5 text-on-surface-variant hover:bg-white/10"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <TocList />
      </div>

      {/* Desktop sticky sidebar */}
      <aside className="hidden lg:block">
        <div className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto rounded-2xl border border-white/10 bg-white/5 p-4">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-on-surface-variant">Contents</h2>
          <TocList />
        </div>
      </aside>
    </>
  );
}
