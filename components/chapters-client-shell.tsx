"use client";

import { ChapterDetailLoader } from "@/components/chapter-detail-loader";
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

  const tocEntries = chapterTitles.map((title) => ({ title, slug: toSlug(title) }));

  return (
    <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-8">
      <ChapterTocSidebar entries={tocEntries} done={done} />

      <div className="space-y-5">
        {chapterTitles.map((title, i) => (
          <div key={title} id={`chapter-${toSlug(title)}`} className="scroll-mt-24">
            <KnowledgeSection eyebrow="Chapter" title={title}>
              <ChapterDetailLoader
                slug={slug}
                chapterTitle={title}
                initialDetails={allInitialDetails[i]}
                isDone={done.has(title)}
                onToggleDone={() => toggle(title)}
              />
            </KnowledgeSection>
          </div>
        ))}
      </div>
    </div>
  );
}
