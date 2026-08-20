import { NextResponse } from "next/server";
import { generateBookIndex } from "@/lib/gemini";
import { createClient } from "@/lib/supabase/server";
import type { BookIndex } from "@/lib/types";

export const runtime = "nodejs";

type RouteProps = { params: Promise<{ slug: string }> };

export async function POST(_request: Request, { params }: RouteProps) {
  const { slug } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // Idempotency: return cached index if it already exists
  const { data: existingRow } = await supabase
    .from("knowledge")
    .select("data")
    .eq("user_id", user.id)
    .eq("slug", slug)
    .eq("key", "index")
    .single();

  if (existingRow) {
    return NextResponse.json({ index: existingRow.data as BookIndex });
  }

  // Verify book ownership
  const { data: bookRow } = await supabase
    .from("books")
    .select("*")
    .eq("user_id", user.id)
    .eq("slug", slug)
    .single();

  if (!bookRow) {
    return NextResponse.json({ error: "Book not found." }, { status: 404 });
  }

  // Download source text from Supabase Storage
  const { data: sourceBlob } = await supabase.storage
    .from("bookmind")
    .download(`${user.id}/source/${slug}.txt`);

  const sourceText = sourceBlob ? (await sourceBlob.text()).trim() : "";

  if (!sourceText) {
    return NextResponse.json(
      { error: "No extracted source text found. Re-upload the PDF." },
      { status: 400 }
    );
  }

  // Mark as processing
  await supabase
    .from("books")
    .update({ status: "processing" })
    .eq("user_id", user.id)
    .eq("slug", slug);

  // Build a Book object from the row for Gemini
  const meta = (bookRow.metadata ?? {}) as Record<string, unknown>;
  const book = {
    slug: bookRow.slug,
    title: bookRow.title,
    author: bookRow.author,
    status: bookRow.status,
    progress: bookRow.progress,
    addedAt: bookRow.added_at,
    category: (meta.category as string) ?? "Uploaded",
    cover: (meta.cover as string) ?? bookRow.slug,
    readingTime: (meta.readingTime as string) ?? "",
    pdfPath: (meta.pdfPath as string) ?? undefined
  };

  try {
    const bookIndex = await generateBookIndex(book, sourceText);

    // Save index to knowledge table
    await supabase.from("knowledge").upsert({
      user_id: user.id,
      slug,
      key: "index",
      data: bookIndex
    });

    // Update book status to indexed
    await supabase
      .from("books")
      .update({ status: "indexed" })
      .eq("user_id", user.id)
      .eq("slug", slug);

    return NextResponse.json({ index: bookIndex });
  } catch (error) {
    // Roll back status so the user can retry
    await supabase
      .from("books")
      .update({ status: "extracted" })
      .eq("user_id", user.id)
      .eq("slug", slug);

    const message = error instanceof Error ? error.message : "Index generation failed.";
    const isQuotaError = message.toLowerCase().includes("quota") || message.includes("RESOURCE_EXHAUSTED");
    if (isQuotaError) {
      const retryMatch = message.match(/retry in ([\d.]+)s/i);
      const retrySeconds = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : null;
      const waitMsg = retrySeconds
        ? ` Please wait about ${Math.ceil(retrySeconds / 60)} minute${retrySeconds > 60 ? "s" : ""} and try again.`
        : " Daily free-tier limit reached. Please try again later.";
      return NextResponse.json({ error: `API quota exceeded.${waitMsg}` }, { status: 429 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
