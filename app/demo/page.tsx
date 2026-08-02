import Link from "next/link";
import { DemoBanner } from "@/components/demo-banner";
import { AppShell } from "@/components/app-shell";
import { BookCard } from "@/components/book-card";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import type { Book, BookStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

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

export default async function DemoPage() {
  const demoUserId = process.env.NEXT_PUBLIC_DEMO_USER_ID;

  let books: Book[] = [];

  if (demoUserId) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("books")
      .select("*")
      .eq("user_id", demoUserId)
      .order("added_at", { ascending: false });
    books = (data ?? []).map(rowToBook);
  }

  return (
    <>
      <DemoBanner />
      <AppShell>
        <PageHeader
          eyebrow="Demo Library"
          title="See BookMind in action"
          description="Browse pre-generated knowledge from real books. Sign up to upload your own."
          action={
            <Link href="/auth/signup" className="rounded-full bg-primary px-5 py-3 font-bold text-on-primary">
              Get Started Free
            </Link>
          }
        />

        {books.length === 0 ? (
          <p className="text-on-surface-variant">Demo books are being prepared. Check back soon.</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {books.map((book) => (
              <Link key={book.slug} href={`/demo/${book.slug}`}>
                <BookCard book={book} />
              </Link>
            ))}
          </div>
        )}
      </AppShell>
    </>
  );
}
