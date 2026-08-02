import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type RouteProps = { params: Promise<{ slug: string }> };

export async function DELETE(_request: Request, { params }: RouteProps) {
  const { slug } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // Verify ownership before deleting
  const { data: book } = await supabase
    .from("books")
    .select("slug, metadata")
    .eq("user_id", user.id)
    .eq("slug", slug)
    .single();

  if (!book) {
    return NextResponse.json({ error: "Book not found." }, { status: 404 });
  }

  // Delete all knowledge rows for this book
  await supabase
    .from("knowledge")
    .delete()
    .eq("user_id", user.id)
    .eq("slug", slug);

  // Delete book row (this is the source of truth; knowledge already gone)
  await supabase
    .from("books")
    .delete()
    .eq("user_id", user.id)
    .eq("slug", slug);

  // Remove files from Supabase Storage (best-effort — don't fail if already missing)
  await supabase.storage.from("bookmind").remove([
    `${user.id}/books/${slug}.pdf`,
    `${user.id}/source/${slug}.txt`
  ]);

  revalidatePath("/");
  revalidatePath("/library");
  revalidatePath(`/books/${slug}`);

  return NextResponse.json({ success: true });
}
