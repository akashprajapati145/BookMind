"use client";

import { useState } from "react";

type GenerateKnowledgeButtonProps = {
  slug: string;
  label?: string;
  className?: string;
};

export function GenerateKnowledgeButton({ slug, label = "Generate Knowledge", className = "" }: GenerateKnowledgeButtonProps) {
  const [status, setStatus] = useState<"idle" | "generating" | "error">("idle");
  const [message, setMessage] = useState("");

  async function generateKnowledge() {
    setStatus("generating");
    setMessage("Generating knowledge package with Google Gemini...");

    const response = await fetch(`/api/books/${slug}/generate`, {
      method: "POST"
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setStatus("error");
      setMessage(body?.error || "Generation failed.");
      return;
    }

    window.location.reload();
  }

  return (
    <div className={`inline-flex min-w-0 flex-col items-start gap-2 ${className}`}>
      <button
        type="button"
        disabled={status === "generating"}
        onClick={generateKnowledge}
        className="whitespace-nowrap rounded-full bg-primary px-5 py-3 font-bold text-on-primary disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "generating" ? "Generating..." : label}
      </button>
      {message ? (
        <p className={status === "error" ? "max-w-xs break-words text-sm font-semibold text-red-300" : "max-w-xs break-words text-sm font-semibold text-secondary"}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
