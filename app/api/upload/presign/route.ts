import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { toSlug } from "@/lib/slug";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json();
  const titleValue = String(body.title || "");
  const fileName = String(body.fileName || "");

  const fallbackTitle = fileName.replace(/\.pdf$/i, "").replace(/[-_]+/g, " ");
  const title = titleValue.trim() || fallbackTitle || "Untitled Book";
  const baseSlug = toSlug(title) || "uploaded-book";

  // Generate a unique slug for this user
  const { data: existingBooks } = await supabase
    .from("books")
    .select("slug")
    .eq("user_id", user.id);

  const usedSlugs = new Set((existingBooks ?? []).map((b: { slug: string }) => b.slug));
  const slug = uniqueSlug(baseSlug, usedSlugs);
  const storagePath = `${user.id}/books/${slug}.pdf`;

  // Create a signed upload URL valid for 120 seconds
  const { data, error } = await supabase.storage
    .from("bookmind")
    .createSignedUploadUrl(storagePath);

  if (error || !data) {
    return NextResponse.json({ error: "Failed to create upload URL." }, { status: 500 });
  }

  return NextResponse.json({ signedUrl: data.signedUrl, token: data.token, storagePath, slug });
}

function uniqueSlug(baseSlug: string, used: Set<string>) {
  if (!used.has(baseSlug)) return baseSlug;
  let index = 2;
  while (used.has(`${baseSlug}-${index}`)) index += 1;
  return `${baseSlug}-${index}`;
}
