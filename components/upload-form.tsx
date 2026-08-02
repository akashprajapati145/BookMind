"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function UploadForm() {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      setStatus("error");
      setMessage("Choose a PDF first.");
      return;
    }

    setStatus("uploading");
    setMessage("Preparing upload...");

    // Step 1: Get a signed upload URL from our API (also generates a unique slug)
    const presignRes = await fetch("/api/upload/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, fileName: file.name })
    });

    if (!presignRes.ok) {
      const body = await presignRes.json().catch(() => null) as { error?: string } | null;
      setStatus("error");
      setMessage(body?.error || "Failed to prepare upload.");
      return;
    }

    const { token, storagePath, slug } = await presignRes.json() as {
      token: string;
      storagePath: string;
      slug: string;
    };

    // Step 2: Upload PDF directly to Supabase Storage — bypasses Vercel's 4.5MB body limit
    setMessage("Uploading PDF...");
    const supabase = createClient();
    const { error: uploadError } = await supabase.storage
      .from("bookmind")
      .uploadToSignedUrl(storagePath, token, file, { contentType: "application/pdf" });

    if (uploadError) {
      setStatus("error");
      setMessage(uploadError.message || "Failed to upload PDF.");
      return;
    }

    // Step 3: Tell the API to extract text and save metadata — only sends small JSON
    setMessage("Processing PDF...");
    const processRes = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug,
        storagePath,
        title: title.trim() || file.name.replace(/\.pdf$/i, ""),
        author
      })
    });

    if (!processRes.ok) {
      const body = await processRes.json().catch(() => null) as { error?: string } | null;
      setStatus("error");
      setMessage(body?.error || "Upload failed.");
      return;
    }

    setStatus("done");
    setMessage("Upload complete! Redirecting to your library...");
    window.location.href = "/library";
  }

  return (
    <form onSubmit={onSubmit} className="grid w-full max-w-2xl gap-6 text-left">
      <label className="grid gap-2">
        <span className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">Book Title</span>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="border-0 border-b-2 border-outline-variant bg-white/5 px-3 py-3 text-on-background outline-none transition focus:border-primary"
          placeholder="Use filename if left blank"
        />
      </label>

      <label className="grid gap-2">
        <span className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">Author</span>
        <input
          value={author}
          onChange={(event) => setAuthor(event.target.value)}
          className="border-0 border-b-2 border-outline-variant bg-white/5 px-3 py-3 text-on-background outline-none transition focus:border-primary"
          placeholder="Unknown Author"
        />
      </label>

      <label className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-primary/40 bg-white/5 p-8 text-center transition hover:border-primary hover:bg-primary/10">
        <span className="text-lg font-bold text-on-background">{file ? file.name : "Choose PDF"}</span>
        <span className="mt-2 text-sm text-on-surface-variant">
          {file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : "Any size — uploaded directly to storage"}
        </span>
        <input
          className="sr-only"
          type="file"
          accept="application/pdf,.pdf"
          onChange={(event) => setFile(event.target.files?.[0] || null)}
        />
      </label>

      <button
        disabled={status === "uploading"}
        className="rounded-full bg-primary px-6 py-3 font-bold text-on-primary disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
      >
        {status === "uploading" ? "Uploading..." : "Upload Book"}
      </button>

      {message ? (
        <p className={status === "error" ? "text-sm font-semibold text-red-300" : "text-sm font-semibold text-secondary"}>
          {message}
        </p>
      ) : null}
    </form>
  );
}
