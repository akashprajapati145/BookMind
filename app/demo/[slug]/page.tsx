import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { BookHero } from "@/components/book-hero";
import { BookNavTabs } from "@/components/book-nav-tabs";
import { DemoBanner } from "@/components/demo-banner";
import { KnowledgeSection } from "@/components/knowledge-section";
import { createClient } from "@/lib/supabase/server";
import type { Book, BookIndex, BookStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

type DemoBookPageProps = { params: Promise<{ slug: string }> };

function rowToBook(row: Record<string, unknown>): Book {
  const meta = (row.metadata ?? {}) as Record<string, unknown>;
  return {
    slug: row.slug as string,
    title: row.title as string,
    author: row.author as string,
    status: row.status as BookStatus,
    progress: row.progress as number,
    addedAt: row.added_at as string,
    category: (meta.category as string) ?? "Uploaded",
    cover: (meta.cover as string) ?? (row.slug as string),
    readingTime: (meta.readingTime as string) ?? "",
    pdfPath: (meta.pdfPath as string) ?? undefined
  };
}

export default async function DemoBookPage({ params }: DemoBookPageProps) {
  const { slug } = await params;
  const demoUserId = process.env.NEXT_PUBLIC_DEMO_USER_ID;

  if (!demoUserId) return notFound();

  const supabase = await createClient();

  const { data: bookRow } = await supabase
    .from("books")
    .select("*")
    .eq("user_id", demoUserId)
    .eq("slug", slug)
    .single();

  if (!bookRow) return notFound();

  const book = rowToBook(bookRow);

  const { data: indexRow } = await supabase
    .from("knowledge")
    .select("data")
    .eq("user_id", demoUserId)
    .eq("slug", slug)
    .eq("key", "index")
    .single();

  const bookIndex = indexRow?.data as BookIndex | undefined;

  return (
    <>
      <DemoBanner />
      <AppShell>
        <BookHero
          book={book}
          thesis={bookIndex?.thesis}
          actions={
            <Link href="/auth/signup" className="rounded-full bg-primary px-5 py-3 font-bold text-on-primary">
              Sign Up to Upload Your Books
            </Link>
          }
        />

        {bookIndex && (
          <>
            <BookNavTabs slug={slug} active="overview" />

            <section className="mt-10 grid gap-5 lg:grid-cols-[1fr_0.8fr]">
              <KnowledgeSection eyebrow="Overview" title="What this book teaches">
                <div className="space-y-4 leading-7">
                  {bookIndex.overview.map((item) => (
                    <p key={item}>{item}</p>
                  ))}
                </div>
              </KnowledgeSection>
              <KnowledgeSection eyebrow="Framework" title="Core operating model">
                <p className="leading-7">{bookIndex.framework}</p>
              </KnowledgeSection>
            </section>

            <section className="mt-10">
              <KnowledgeSection eyebrow="Contents" title="Chapter overview">
                <div className="grid gap-4 md:grid-cols-3">
                  {bookIndex.contents.map((part) => (
                    <div key={part.title}>
                      <h3 className="mb-2 text-sm font-bold text-secondary">{part.title}</h3>
                      <ul className="space-y-1 text-sm leading-6 text-on-surface-variant">
                        {part.chapters.map((ch) => <li key={ch}>{ch}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              </KnowledgeSection>
            </section>
          </>
        )}

        <div className="mt-10 rounded-2xl border border-primary/20 bg-primary/10 p-8 text-center">
          <h2 className="font-display text-2xl font-bold text-on-background">Ready to learn your own books?</h2>
          <p className="mt-2 text-on-surface-variant">Upload any PDF and get AI-generated knowledge in minutes.</p>
          <Link href="/auth/signup" className="mt-6 inline-block rounded-full bg-primary px-8 py-3 font-bold text-on-primary">
            Sign Up Free
          </Link>
        </div>
      </AppShell>
    </>
  );
}
