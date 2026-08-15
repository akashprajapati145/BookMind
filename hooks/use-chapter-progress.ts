"use client";

import { useCallback, useEffect, useState } from "react";

function storageKey(slug: string) {
  return `bookmind-progress-${slug}`;
}

export function useChapterProgress(slug: string) {
  const [done, setDone] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey(slug));
      if (stored) setDone(new Set(JSON.parse(stored) as string[]));
    } catch {}
  }, [slug]);

  const toggle = useCallback((chapterTitle: string) => {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(chapterTitle)) {
        next.delete(chapterTitle);
      } else {
        next.add(chapterTitle);
      }
      try {
        localStorage.setItem(storageKey(slug), JSON.stringify([...next]));
      } catch {}
      return next;
    });
  }, [slug]);

  return { done, toggle };
}
