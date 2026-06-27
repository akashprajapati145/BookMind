/**
 * Standing diagnostic — not a one-off test script.
 *
 * Runs the EXACT production chapter-isolation function (lib/chapter-isolation.ts,
 * the same one app/api/books/[slug]/chapters/route.ts calls for real generation)
 * against every chapter of every book currently in storage/. Flags anything that
 * doesn't resolve to either a confident match or a legitimate fallback, instead
 * of silently accepting whatever comes back.
 *
 * Run with: npx tsx scripts/check-chapter-boundaries.ts
 *
 * Skips any book without an index.json yet — that's the normal, generic state
 * a freshly uploaded book sits in before its first dashboard visit (indexing
 * happens automatically and the same way for every book then), not something
 * this script should special-case or work around.
 */

import fs from "node:fs";
import path from "node:path";
import { isolateChapterText } from "../lib/chapter-isolation";
import { loadOutline } from "../lib/pdf-outline";
import type { Book, BookIndex } from "../lib/types";

const root = process.cwd();
const knowledgeRoot = path.join(root, "storage", "knowledge");
const libraryPath = path.join(root, "storage", "library.json");

type ChapterResult = {
  title: string;
  status: "resolved" | "null-fallback" | "FLAG";
  length: number | null;
  note: string;
};

function buildFlexiblePattern(text: string): RegExp {
  const escaped = text
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("\\s+");
  return new RegExp(escaped, "i");
}

// Cross-contamination check: does this chapter's isolated text contain another
// chapter's title (other than itself)? NOTE: this flags CANDIDATES for manual
// review, not confirmed bugs — non-fiction books legitimately reference other
// chapters' concepts by name in passing (e.g. "I'll cover mini-retirements in
// detail in a later chapter"). A flag means "look at the context," not
// "definitely broken." What actually matters is whether the mention is a
// single incidental reference vs. a large block of that chapter's real content.
function findContamination(text: string, ownTitle: string, allTitles: string[]): string | null {
  for (const otherTitle of allTitles) {
    if (otherTitle === ownTitle) continue;
    // Use a meaningful chunk of the other title (skip very short titles, which
    // risk false positives from common words).
    if (otherTitle.length < 12) continue;
    const anchor = otherTitle.split(/[:–—]/)[0].trim();
    if (anchor.length < 10) continue;
    if (buildFlexiblePattern(anchor).test(text)) {
      return otherTitle;
    }
  }
  return null;
}

async function checkBook(slug: string): Promise<void> {
  const bookDir = path.join(knowledgeRoot, slug);
  const indexPath = path.join(bookDir, "index.json");
  const sourcePath = path.join(bookDir, "source.txt");

  if (!fs.existsSync(indexPath) || !fs.existsSync(sourcePath)) {
    console.log(`\n=== ${slug} ===`);
    console.log("SKIPPED — not yet indexed (same state any freshly uploaded book sits in before its first dashboard visit).");
    return;
  }

  const index = JSON.parse(fs.readFileSync(indexPath, "utf8")) as BookIndex;
  const sourceText = fs.readFileSync(sourcePath, "utf8");
  const allTitles = index.contents.flatMap((part) => part.chapters);

  const books = JSON.parse(fs.readFileSync(libraryPath, "utf8")) as Book[];
  const book = books.find((b) => b.slug === slug);
  const outline = book?.pdfPath ? await loadOutline(path.join(root, book.pdfPath)) : null;

  console.log(`\n=== ${slug} ===`);
  console.log(`Chapters: ${allTitles.length} | Outline available: ${outline ? `yes (${outline.entries.length} entries)` : "no"}`);

  const results: ChapterResult[] = [];

  for (const title of allTitles) {
    const text = isolateChapterText(sourceText, allTitles, title, outline);

    if (text === null) {
      results.push({ title, status: "null-fallback", length: null, note: "falls back to full-book text + focus instruction (safe, just less efficient)" });
      continue;
    }

    const contaminatedBy = findContamination(text, title, allTitles);
    if (contaminatedBy) {
      results.push({ title, status: "FLAG", length: text.length, note: `contains another chapter's title: "${contaminatedBy}" — possible overreach` });
      continue;
    }

    if (text.length < 100) {
      results.push({ title, status: "FLAG", length: text.length, note: "suspiciously short for a resolved (non-null) result" });
      continue;
    }

    results.push({ title, status: "resolved", length: text.length, note: "ok" });
  }

  for (const r of results) {
    const marker = r.status === "FLAG" ? "  ⚠ FLAG " : r.status === "null-fallback" ? "  (null) " : "  ok     ";
    console.log(`${marker} ${r.length ?? "—"} chars  "${r.title}"  ${r.status === "resolved" ? "" : `— ${r.note}`}`);
  }

  const flagged = results.filter((r) => r.status === "FLAG");
  const resolved = results.filter((r) => r.status === "resolved").length;
  const fallback = results.filter((r) => r.status === "null-fallback").length;
  console.log(`\nSummary: ${resolved} resolved, ${fallback} null-fallback, ${flagged.length} FLAGGED`);
  if (flagged.length > 0) {
    console.log("FLAGGED ENTRIES NEED MANUAL REVIEW:");
    flagged.forEach((f) => console.log(`  - "${f.title}": ${f.note}`));
  }
}

async function main() {
  const bookDirs = fs.readdirSync(knowledgeRoot).filter((name) => fs.statSync(path.join(knowledgeRoot, name)).isDirectory());

  for (const slug of bookDirs) {
    await checkBook(slug);
  }
}

main();
