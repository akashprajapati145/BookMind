"use client";

import { useState } from "react";
import { ChapterDetailLoader } from "@/components/chapter-detail-loader";
import { ChapterPageReader } from "@/components/chapter-page-reader";
import { ChapterTocSidebar } from "@/components/chapter-toc-sidebar";
import { KnowledgeSection } from "@/components/knowledge-section";
import { useChapterProgress } from "@/hooks/use-chapter-progress";
import { toSlug } from "@/lib/slug";
import type { ChapterDetail } from "@/lib/types";

type ChaptersClientShellProps = {
  slug: string;
  chapterTitles: string[];
  allInitialDetails: (Record<string, ChapterDetail> | undefined)[];
};

export function ChaptersClientShell({ slug, chapterTitles, allInitialDetails }: ChaptersClientShellProps) {
  const { done, toggle } = useChapterProgress(slug);
  const [detailsByChapter, setDetailsByChapter] = useState<Record<string, Record<string, ChapterDetail>>>(
    () => Object.fromEntries(
      chapterTitles.map((title, i) => [title, allInitialDetails[i] ?? {}])
    )
  );
  const [pageReaderOpen, setPageReaderOpen] = useState(false);
  const [pageReaderStart, setPageReaderStart] = useState(0);

  const tocEntries = chapterTitles.map((title) => ({ title, slug: toSlug(title) }));

  function handleChapterLoaded(title: string, lang: string, detail: ChapterDetail) {
    setDetailsByChapter((prev) => ({
      ...prev,
      [title]: { ...(prev[title] ?? {}), [lang]: detail }
    }));
  }

  function openPageReader(startIndex: number) {
    setPageReaderStart(startIndex);
    setPageReaderOpen(true);
  }

  const pages = chapterTitles.map((title) => ({
    title,
    detail: Object.values(detailsByChapter[title] ?? {})[0]
  }));

  return (
    <>
      {/* View toggle icon — top right */}
      <div className="mb-6 flex items-center justify-end">
        <button
          onClick={() => openPageReader(0)}
          title="Switch to page view"
          className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-sm font-semibold text-on-surface-variant transition hover:border-primary/40 hover:text-on-background"
        >
          {/* Book/pages icon */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
          </svg>
          <span className="hidden sm:inline">Page view</span>
        </button>
      </div>

      {/* Scroll view */}
      <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-8">
        <ChapterTocSidebar entries={tocEntries} done={done} />

        <div className="space-y-5">
          {chapterTitles.map((title, i) => (
            <div key={title} id={`chapter-${toSlug(title)}`} className="scroll-mt-24">
              <KnowledgeSection eyebrow="Chapter" title={title}>
                <ChapterDetailLoader
                  slug={slug}
                  chapterTitle={title}
                  initialDetails={detailsByChapter[title]}
                  isDone={done.has(title)}
                  onToggleDone={() => toggle(title)}
                  onLoaded={(lang, detail) => handleChapterLoaded(title, lang, detail)}
                />
              </KnowledgeSection>
            </div>
          ))}
        </div>
      </div>

      {/* Page reader overlay */}
      {pageReaderOpen && (
        <ChapterPageReader
          pages={pages}
          initialPage={pageReaderStart}
          onClose={() => setPageReaderOpen(false)}
        />
      )}
    </>
  );
}
