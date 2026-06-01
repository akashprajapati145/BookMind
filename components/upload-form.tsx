"use client";

import { useState } from "react";

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
    setMessage("Saving PDF to local storage...");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title);
    formData.append("author", author);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setStatus("error");
      setMessage(body?.error || "Upload failed.");
      return;
    }

    setStatus("done");
    setMessage("Upload saved. The book is now in your library.");
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
        <span className="mt-2 text-sm text-on-surface-variant">Stored locally under storage/books</span>
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
