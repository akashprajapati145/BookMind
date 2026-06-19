"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type State = "idle" | "confirm" | "removing";

type RemoveBookButtonProps = {
  slug: string;
};

export function RemoveBookButton({ slug }: RemoveBookButtonProps) {
  const router = useRouter();
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState("");

  async function remove() {
    setState("removing");
    setError("");

    try {
      const res = await fetch(`/api/books/${slug}`, { method: "DELETE" });

      if (!res.ok) {
        const data = await res.json().catch(() => null) as { error?: string } | null;
        setError(data?.error ?? "Failed to remove book.");
        setState("confirm");
        return;
      }

      router.push("/library");
    } catch {
      setError("Connection failed. Try again.");
      setState("confirm");
    }
  }

  if (state === "idle") {
    return (
      <button
        type="button"
        onClick={() => setState("confirm")}
        className="glass rounded-full px-5 py-3 font-bold text-red-400 hover:border-red-400/40"
      >
        Remove Book
      </button>
    );
  }

  if (state === "confirm") {
    return (
      <div className="glass flex flex-wrap items-center gap-3 rounded-2xl px-5 py-3">
        <span className="text-sm font-semibold text-on-surface-variant">
          Remove book and all its data?
        </span>
        {error ? <span className="text-sm text-red-300">{error}</span> : null}
        <button
          type="button"
          onClick={remove}
          className="rounded-full bg-red-500/20 px-4 py-2 text-sm font-bold text-red-300 hover:bg-red-500/30"
        >
          Yes, remove
        </button>
        <button
          type="button"
          onClick={() => { setState("idle"); setError(""); }}
          className="rounded-full border border-white/10 px-4 py-2 text-sm font-bold text-on-surface-variant hover:border-white/20"
        >
          Cancel
        </button>
      </div>
    );
  }

  // removing
  return (
    <div className="glass rounded-2xl px-5 py-3">
      <span className="animate-pulse text-sm font-semibold text-red-400">Removing...</span>
    </div>
  );
}
