"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const MESSAGES = [
  "Reading the book structure...",
  "Extracting key concepts...",
  "Building your learning index...",
  "Generating 1-minute overview...",
  "Almost ready..."
];

type AutoIndexGeneratorProps = {
  slug: string;
};

export function AutoIndexGenerator({ slug }: AutoIndexGeneratorProps) {
  const router = useRouter();
  const [message, setMessage] = useState(MESSAGES[0]);
  const [error, setError] = useState("");

  useEffect(() => {
    let msgIndex = 0;
    const interval = setInterval(() => {
      msgIndex = (msgIndex + 1) % MESSAGES.length;
      setMessage(MESSAGES[msgIndex]);
    }, 4500);

    fetch(`/api/books/${slug}/index`, { method: "POST" })
      .then(async (res) => {
        clearInterval(interval);
        if (res.ok) {
          router.refresh();
        } else {
          const data = await res.json().catch(() => null) as { error?: string } | null;
          setError(data?.error ?? "Index generation failed. Please try again.");
        }
      })
      .catch(() => {
        clearInterval(interval);
        setError("Connection failed. Please refresh the page to retry.");
      });

    return () => clearInterval(interval);
  }, [slug, router]);

  if (error) {
    return (
      <div className="glass rounded-2xl p-8 text-center">
        <p className="mb-4 text-sm font-semibold text-red-300">{error}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-full bg-primary px-5 py-3 text-sm font-bold text-on-primary"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-10 text-center">
      <div className="mb-6 flex justify-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="inline-block h-2 w-2 animate-bounce rounded-full bg-primary"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-secondary">Analyzing</p>
      <p className="mt-2 text-on-surface-variant transition-all duration-500">{message}</p>
    </div>
  );
}
