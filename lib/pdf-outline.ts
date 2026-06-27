import fs from "node:fs/promises";
import { PDFArray, PDFContext, PDFDict, PDFDocument, PDFHexString, PDFName, PDFRef, PDFString } from "pdf-lib";

// Reads a PDF's embedded outline/bookmark tree (the same structure that powers
// a clickable table of contents in a PDF viewer) and resolves chapter titles
// to their exact location via the PDF's own page references — instead of
// pattern-matching how a heading happens to render in extracted text, which
// varies a lot between books (fonts, all-caps styling, headings split across
// lines, OCR artifacts). Falls back to null at every step rather than guess;
// callers are expected to fall back to text-anchor matching when this returns
// null for a given title.

type OutlineEntry = {
  title: string;
  dest: unknown;
};

export type BookOutline = {
  doc: PDFDocument;
  entries: OutlineEntry[];
};

export async function loadOutline(pdfPath: string): Promise<BookOutline | null> {
  try {
    const bytes = await fs.readFile(pdfPath);
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });

    const outlinesRef = doc.catalog.get(PDFName.of("Outlines"));
    if (!outlinesRef) return null;

    const outlinesDict = doc.context.lookup(outlinesRef);
    if (!(outlinesDict instanceof PDFDict)) return null;

    const entries = walkOutline(outlinesDict, doc.context);
    if (entries.length === 0) return null;

    return { doc, entries };
  } catch {
    // Missing file, encrypted/corrupt PDF, unexpected structure — treat as
    // "no outline available," same as a book that genuinely has none.
    return null;
  }
}

function decodeText(value: unknown): string {
  if (value instanceof PDFString || value instanceof PDFHexString) return value.decodeText();
  return "";
}

// Recurses into both siblings (Next) and children (First) — bookmark trees
// nest, and a book's real chapter-level entries are sometimes one level
// (or more) deep under a part/section heading rather than at the top level.
function walkOutline(
  dict: PDFDict,
  context: PDFContext,
  depth = 0,
  results: OutlineEntry[] = [],
  seen: Set<string> = new Set()
): OutlineEntry[] {
  let current = dict.get(PDFName.of("First"));

  while (current) {
    const key = current.toString();
    if (seen.has(key)) break; // guard against malformed circular refs
    seen.add(key);

    const node = context.lookup(current);
    if (!(node instanceof PDFDict)) break;

    const titleRaw = node.get(PDFName.of("Title"));
    const title = titleRaw ? decodeText(titleRaw) : "";
    const dest = node.get(PDFName.of("Dest"));
    if (title) results.push({ title, dest });

    if (node.get(PDFName.of("First"))) {
      walkOutline(node, context, depth + 1, results, seen);
    }

    current = node.get(PDFName.of("Next"));
  }

  return results;
}

function resolvePageIndex(doc: PDFDocument, dest: unknown): number | null {
  if (!dest) return null;

  const resolved = dest instanceof PDFRef ? doc.context.lookup(dest) : dest;
  const arr = resolved instanceof PDFArray ? resolved : dest instanceof PDFArray ? dest : null;
  if (!arr) return null;

  const pageRef = arr.get(0);
  if (!(pageRef instanceof PDFRef)) return null;

  const pages = doc.getPages();
  for (let i = 0; i < pages.length; i++) {
    if (pages[i].ref === pageRef) return i;
  }
  return null;
}

// Strips an outline-added "Chapter N - " style prefix and normalizes
// punctuation/case — but deliberately keeps the rest of the title (including
// any subtitle after a colon) intact. Titles like "Income Autopilot I" and
// "Income Autopilot II" differ only by a trailing numeral — discarding the
// subtitle here would make them collide. Matching must be strict precisely
// because of that case, not despite it.
function normalizeForTitleMatch(title: string): string {
  return title
    .replace(/^chapter\s+\d+\s*[-–—:]\s*/i, "")
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Exact match first. Outlines also commonly add OTHER generic label prefixes
// beyond "Chapter N -" — "Conclusion:", "Introduction:", "Part II:", etc. —
// before the actual title, which normalizeForTitleMatch doesn't enumerate.
// Rather than list every possible label, allow a SUFFIX match: the shorter
// normalized title must be the exact tail of the longer one, starting at a
// word boundary. This stays safe against the "Income Autopilot I/II/III"
// collision risk because it still requires exact equality of the full
// remaining text (subtitle included) — only a leading label may be dropped,
// never a trailing differentiator.
function titlesMatch(outlineTitle: string, targetTitle: string): boolean {
  const a = normalizeForTitleMatch(outlineTitle);
  const b = normalizeForTitleMatch(targetTitle);
  if (a === b) return true;

  const longer = a.length >= b.length ? a : b;
  const shorter = a.length >= b.length ? b : a;
  if (shorter.length < 8 || !longer.endsWith(shorter)) return false;

  const boundaryIndex = longer.length - shorter.length;
  return boundaryIndex === 0 || longer[boundaryIndex - 1] === " ";
}

// Resolves a chapter title to its character offset in the extracted source
// text, via the PDF's own outline structure. Returns null — never a guess —
// if: the title doesn't match exactly one outline entry, the destination
// doesn't resolve to a real page, or that page's marker can't be found in the
// extracted text (pdf-parse embeds "-- N of TOTAL --" markers whose number
// lines up directly with the PDF's own 0-based page index).
export function resolveOutlineOffset(targetTitle: string, outline: BookOutline, sourceText: string): number | null {
  const candidates = outline.entries.filter((entry) => titlesMatch(entry.title, targetTitle));
  if (candidates.length !== 1) return null;

  return resolveEntryOffset(candidates[0], outline, sourceText);
}

function resolveEntryOffset(entry: OutlineEntry, outline: BookOutline, sourceText: string): number | null {
  const pageIndex = resolvePageIndex(outline.doc, entry.dest);
  if (pageIndex === null) return null;

  const markerPattern = new RegExp(`--\\s*${pageIndex}\\s+of\\s+\\d+\\s*--`);
  const match = markerPattern.exec(sourceText);
  if (!match) return null;

  return match.index + match[0].length;
}

// Finds the offset of whatever outline entry immediately FOLLOWS the one
// matching `afterTitle`, in the PDF's own bookmark order — regardless of
// whether that next entry is one of our curated chapter titles. Used so a
// chapter that's the LAST one in our curated list, but not the last bookmark
// in the PDF itself, doesn't swallow legitimate-but-uncurated back-matter
// (Appendix, Notes, Index) that the PDF's own structure shows comes next.
export function resolveNextOutlineBoundary(afterTitle: string, outline: BookOutline, sourceText: string): number | null {
  const matchIndex = outline.entries.findIndex((entry) => titlesMatch(entry.title, afterTitle));
  if (matchIndex === -1) return null;

  for (let i = matchIndex + 1; i < outline.entries.length; i++) {
    const offset = resolveEntryOffset(outline.entries[i], outline, sourceText);
    if (offset !== null) return offset;
  }

  return null;
}
