"use client";

import { useState } from "react";
import { DEFAULT_LANGUAGE, LANGUAGES } from "@/lib/languages";
import type { ChapterDetail } from "@/lib/types";

type ChapterDetailLoaderProps = {
  slug: string;
  chapterTitle: string;
  initialDetail?: ChapterDetail;
};

export function ChapterDetailLoader({ slug, chapterTitle, initialDetail }: ChapterDetailLoaderProps) {
  // English keeps its original, unchanged flow: a single manual "Load" button,
  // nothing automatic. Once loaded it becomes the first entry in `detailByLang`.
  const [englishStatus, setEnglishStatus] = useState<"idle" | "loading" | "error">("idle");
  const [englishError, setEnglishError] = useState("");
  const [detailByLang, setDetailByLang] = useState<Record<string, ChapterDetail>>(
    initialDetail ? { [DEFAULT_LANGUAGE]: initialDetail } : {}
  );
  const [activeLang, setActiveLang] = useState(DEFAULT_LANGUAGE);

  // Dropdown + Generate flow for every language beyond English. A language only
  // becomes a clickable tag once its content actually exists — selecting an
  // existing tag only switches the view, it never triggers generation.
  const pendingLanguages = LANGUAGES.filter((l) => l.code !== DEFAULT_LANGUAGE && !detailByLang[l.code]);
  const [selectedPending, setSelectedPending] = useState(pendingLanguages[0]?.code ?? "");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");

  const generatedLanguages = LANGUAGES.filter((l) => detailByLang[l.code]);

  async function fetchChapter(lang: string): Promise<ChapterDetail> {
    const res = await fetch(`/api/books/${slug}/chapters`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: chapterTitle, lang })
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null) as { error?: string } | null;
      throw new Error(data?.error ?? "Failed to load chapter summary.");
    }

    const data = await res.json() as { chapter: ChapterDetail };
    return data.chapter;
  }

  async function loadEnglish() {
    setEnglishStatus("loading");
    try {
      const detail = await fetchChapter(DEFAULT_LANGUAGE);
      setDetailByLang((prev) => ({ ...prev, [DEFAULT_LANGUAGE]: detail }));
      setActiveLang(DEFAULT_LANGUAGE);
    } catch (error) {
      setEnglishError(error instanceof Error ? error.message : "Failed to load chapter summary.");
      setEnglishStatus("error");
    }
  }

  async function generateSelected() {
    if (!selectedPending) return;
    setGenerating(true);
    setGenerateError("");
    try {
      const detail = await fetchChapter(selectedPending);
      setDetailByLang((prev) => ({ ...prev, [selectedPending]: detail }));
      setActiveLang(selectedPending);
      const nextPending = LANGUAGES.find((l) => l.code !== DEFAULT_LANGUAGE && l.code !== selectedPending && !detailByLang[l.code]);
      setSelectedPending(nextPending?.code ?? "");
    } catch (error) {
      setGenerateError(error instanceof Error ? error.message : "Generation failed.");
    } finally {
      setGenerating(false);
    }
  }

  const englishLoaded = Boolean(detailByLang[DEFAULT_LANGUAGE]);

  return (
    <div className="space-y-4">
      {!englishLoaded ? (
        <>
          {englishStatus === "idle" ? (
            <button
              type="button"
              onClick={loadEnglish}
              className="rounded-full border border-white/10 px-4 py-2 text-sm font-bold text-on-surface-variant transition hover:border-primary/40 hover:text-on-background"
            >
              Load chapter summary
            </button>
          ) : null}

          {englishStatus === "loading" ? (
            <p className="animate-pulse text-sm font-semibold text-secondary">Analyzing chapter...</p>
          ) : null}

          {englishStatus === "error" ? (
            <div className="space-y-2">
              <p className="text-sm text-red-300">{englishError}</p>
              <button
                type="button"
                onClick={loadEnglish}
                className="rounded-full border border-white/10 px-4 py-2 text-sm font-bold text-on-surface-variant hover:border-primary/40"
              >
                Retry
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <>
          {/* Tags only exist for languages that are already generated — clicking one only switches the view. */}
          {generatedLanguages.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {generatedLanguages.map((language) => (
                <button
                  key={language.code}
                  type="button"
                  onClick={() => setActiveLang(language.code)}
                  className={
                    activeLang === language.code
                      ? "rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-on-primary"
                      : "rounded-full border border-white/10 px-3 py-1.5 text-xs font-bold text-on-surface-variant transition hover:border-primary/40"
                  }
                >
                  {language.label}
                </button>
              ))}
            </div>
          ) : null}

          {detailByLang[activeLang] ? (
            <div className="space-y-5">
              <div className="space-y-3">
                {detailByLang[activeLang].summary.map((paragraph) => (
                  <p key={paragraph} className="leading-7">{paragraph}</p>
                ))}
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <DetailList title="Key Ideas" items={detailByLang[activeLang].keyIdeas} />
                <DetailList title="Examples" items={detailByLang[activeLang].examples} />
                <DetailList title="Action Items" items={detailByLang[activeLang].actionItems} />
              </div>
            </div>
          ) : null}

          {/* Explicit dropdown + Generate button — the only way a new language gets created. */}
          {pendingLanguages.length > 0 ? (
            <div className="flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
              <div className="relative inline-flex">
                <select
                  value={selectedPending}
                  onChange={(event) => setSelectedPending(event.target.value)}
                  disabled={generating}
                  className="appearance-none rounded-full border border-white/10 bg-white/5 py-2 pl-4 pr-8 text-sm font-semibold text-on-background outline-none focus:border-primary/40 disabled:opacity-60"
                >
                  {pendingLanguages.map((language) => (
                    <option key={language.code} value={language.code} className="bg-background text-on-background">
                      {language.label}
                    </option>
                  ))}
                </select>
                <svg
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </div>
              <button
                type="button"
                onClick={generateSelected}
                disabled={generating || !selectedPending}
                className="rounded-full border border-white/10 px-4 py-2 text-sm font-bold text-on-surface-variant transition hover:border-primary/40 hover:text-on-background disabled:cursor-not-allowed disabled:opacity-60"
              >
                {generating ? "Generating..." : "Generate"}
              </button>
              {generateError ? <span className="text-sm text-red-300">{generateError}</span> : null}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function DetailList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.16em] text-secondary">{title}</h3>
      <ul className="space-y-2 text-sm leading-6">
        {items.map((item) => (
          <li key={item} className="border-b border-white/10 pb-2 last:border-0">{item}</li>
        ))}
      </ul>
    </div>
  );
}
