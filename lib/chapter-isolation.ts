import { resolveNextOutlineBoundary, resolveOutlineOffset, type BookOutline } from "@/lib/pdf-outline";

// Slices out just the target chapter's text instead of sending the whole book on
// every call. Tries the PDF's own outline/bookmark structure first (resolves a
// chapter title to its real page via the PDF's own pointers — sidesteps the
// whole class of problem text-pattern matching has to fight: subtitle
// formatting, table-of-contents-vs-real-heading ambiguity). Falls back to
// text-anchor matching whenever outline can't confirm a boundary. Either way,
// the END boundary is NEVER a window-edge guess — it's confirmed via outline OR
// confirmed via text-anchor, regardless of how the start was determined. That
// invariant is exactly what the original bug violated.
//
// Pulled into its own module (rather than living inside lib/gemini.ts) so the
// standing diagnostic script can import and test this exact function directly
// against real book data, instead of a separate reimplementation that could
// silently drift from what production actually runs.

export const CHAPTER_LOOKAHEAD = 200000;

export function isolateChapterText(
  sourceText: string,
  allChapterTitles: string[],
  targetTitle: string,
  outline: BookOutline | null
): string | null {
  const targetIndex = allChapterTitles.indexOf(targetTitle);
  const nextTitle = targetIndex >= 0 ? allChapterTitles[targetIndex + 1] ?? null : null;

  const outlineStart = outline ? resolveOutlineOffset(targetTitle, outline, sourceText) : null;

  if (outlineStart === null || !outline) {
    // Outline didn't confirm the start — fall back to the text-anchor approach,
    // which finds and disambiguates the start in one pass (the TOC-vs-heading
    // gap heuristic needs the next title's position regardless).
    return isolateChapterTextViaTextAnchor(sourceText, targetTitle, nextTitle);
  }

  if (!nextTitle) {
    // Last chapter in OUR curated list — but the PDF itself likely continues
    // with back-matter (Appendix, Notes, Index) that isn't one of our
    // chapters. Use the PDF's own next bookmark as a tighter boundary when
    // available, instead of swallowing everything to the end of the book.
    const nextBoundary = resolveNextOutlineBoundary(targetTitle, outline, sourceText);
    const windowEnd =
      nextBoundary !== null && nextBoundary - outlineStart >= 200
        ? nextBoundary
        : Math.min(outlineStart + CHAPTER_LOOKAHEAD, sourceText.length);
    const text = trimBackMatter(sourceText.slice(outlineStart, windowEnd)).trim();
    return text.length >= 200 ? text : null;
  }

  const outlineEnd = resolveOutlineOffset(nextTitle, outline, sourceText);
  if (outlineEnd !== null && outlineEnd - outlineStart >= 200) {
    return sourceText.slice(outlineStart, outlineEnd).trim();
  }

  // Outline confirmed the start but not the end — search forward from the
  // known-good start (no disambiguation needed, start is already certain),
  // but still confirmed-only: no match means null, never a guess.
  const confirmedEnd = findConfirmedEnd(sourceText, nextTitle, outlineStart);
  if (confirmedEnd === null) return null;

  return sourceText.slice(outlineStart, confirmedEnd).trim();
}

// Used when outline didn't confirm the start at all. Disambiguates the real
// heading from a table-of-contents listing by preferring whichever occurrence
// has the largest CONFIRMED gap before the next chapter's title — never falls
// back to "assume it extends to the window edge."
function isolateChapterTextViaTextAnchor(sourceText: string, targetTitle: string, nextTitle: string | null): string | null {
  const occurrences = findTitleOccurrences(sourceText, buildTitleSearchAnchor(targetTitle));
  if (occurrences.length === 0) return null;

  if (!nextTitle) {
    const start = occurrences[occurrences.length - 1];
    const windowEnd = Math.min(start + CHAPTER_LOOKAHEAD, sourceText.length);
    const text = trimBackMatter(sourceText.slice(start, windowEnd)).trim();
    return text.length >= 200 ? text : null;
  }

  const nextPattern = buildFlexiblePattern(buildTitleSearchAnchor(nextTitle), "i");

  let bestStart: number | null = null;
  let bestEnd: number | null = null;
  let bestGap = -1;

  for (const start of occurrences) {
    const windowEnd = Math.min(start + CHAPTER_LOOKAHEAD, sourceText.length);
    const window = sourceText.slice(start, windowEnd);
    const nextMatch = nextPattern.exec(window);

    // Only accept an occurrence if the next chapter's heading is actually
    // confirmed within the window — never fall back to "assume it extends to
    // the edge of the window," which is what let one chapter's isolated text
    // silently swallow several unrelated chapters' worth of content.
    if (!nextMatch) continue;

    const end = start + nextMatch.index;
    const gap = end - start;
    if (gap > bestGap) {
      bestGap = gap;
      bestStart = start;
      bestEnd = end;
    }
  }

  // No occurrence had a confirmed end boundary, or the best one found is
  // implausibly small (likely a table-of-contents match) — don't guess.
  if (bestStart === null || bestEnd === null || bestGap < 200) return null;

  return sourceText.slice(bestStart, bestEnd).trim();
}

// Given a CONFIRMED start position, finds where the next chapter begins by
// searching forward only. Confirmed-only: if the next title can't be located
// within the window, returns null rather than guessing the window edge.
function findConfirmedEnd(sourceText: string, nextTitle: string, fromOffset: number): number | null {
  const windowEnd = Math.min(fromOffset + CHAPTER_LOOKAHEAD, sourceText.length);
  const window = sourceText.slice(fromOffset, windowEnd);
  const nextPattern = buildFlexiblePattern(buildTitleSearchAnchor(nextTitle), "i");
  const match = nextPattern.exec(window);
  if (!match) return null;

  const end = fromOffset + match.index;
  return end - fromOffset >= 200 ? end : null;
}

function findTitleOccurrences(sourceText: string, anchor: string): number[] {
  const pattern = buildFlexiblePattern(anchor, "gi");
  const occurrences: number[] = [];
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(sourceText)) !== null) {
    occurrences.push(match.index + match[0].length);
    if (occurrences.length > 20) break;
    if (match[0].length === 0) pattern.lastIndex += 1;
  }

  return occurrences;
}

// Strips trailing copyright/cataloging boilerplate that follows the real
// content on the last page(s) of a book — generic markers common across
// published books, not specific to any one title.
function trimBackMatter(text: string): string {
  const backMatterPattern = /\n\s*(?:ISBN[\s:-]|Library of Congress|All rights reserved|eISBN)/i;
  const match = backMatterPattern.exec(text);
  return match ? text.slice(0, match.index) : text;
}

// Subtitles after a colon/dash are often formatted very differently in the raw
// extracted text (separate line, different case) than in the AI-generated
// chapter title, so anchor on the portion before it when that's substantial
// enough to be a reliable, distinctive search target.
function buildTitleSearchAnchor(title: string): string {
  const primary = title.split(/[:–—]/)[0].trim();
  const wordCount = primary.split(/\s+/).filter(Boolean).length;
  return wordCount >= 2 && primary.length >= 8 ? primary : title;
}

function buildFlexiblePattern(text: string, flags = "i"): RegExp {
  const escaped = text
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("\\s+");
  return new RegExp(escaped, flags);
}
