import { NextResponse } from "next/server";
import { generateLearningMode } from "@/lib/gemini";
import { createClient } from "@/lib/supabase/server";
import type { BookIndex, LearningMode } from "@/lib/types";

export const runtime = "nodejs";

type RouteProps = { params: Promise<{ slug: string; mode: string }> };

export async function POST(_request: Request, { params }: RouteProps) {
  const { slug, mode } = await params;

  if (!["10", "30"].includes(mode)) {
    return NextResponse.json({ error: "Invalid learning mode." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const modeKey = `modes/${mode}`;

  // Idempotency: return cached mode if it already exists
  const { data: existingRow } = await supabase
    .from("knowledge")
    .select("data")
    .eq("user_id", user.id)
    .eq("slug", slug)
    .eq("key", modeKey)
    .single();

  if (existingRow) {
    return NextResponse.json({ mode: existingRow.data as LearningMode });
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

  // Load book index
  const { data: indexRow } = await supabase
    .from("knowledge")
    .select("data")
    .eq("user_id", user.id)
    .eq("slug", slug)
    .eq("key", "index")
    .single();

  if (!indexRow) {
    return NextResponse.json(
      { error: "Book index not found. Generate the index first." },
      { status: 400 }
    );
  }

  // Download source text
  const { data: sourceBlob } = await supabase.storage
    .from("bookmind")
    .download(`${user.id}/source/${slug}.txt`);

  const sourceText = sourceBlob ? (await sourceBlob.text()).trim() : "";

  if (!sourceText) {
    return NextResponse.json(
      { error: "No source text found. Re-upload the PDF." },
      { status: 400 }
    );
  }

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
    const learningMode = await generateLearningMode(book, mode, sourceText, indexRow.data as BookIndex);

    await supabase.from("knowledge").upsert({
      user_id: user.id,
      slug,
      key: modeKey,
      data: learningMode
    });

    return NextResponse.json({ mode: learningMode });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Mode generation failed." },
      { status: 500 }
    );
  }
}
