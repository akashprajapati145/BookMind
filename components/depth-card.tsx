import Link from "next/link";
import { GlassCard } from "@/components/glass-card";
import { routes } from "@/lib/routes";
import type { LearningMode } from "@/lib/types";

type DepthCardProps = {
  slug: string;
  mode: LearningMode;
};

export function DepthCard({ slug, mode }: DepthCardProps) {
  return (
    <Link href={routes.learn(slug, mode.slug)} className="group block">
      <GlassCard className="h-full p-5 transition duration-300 group-hover:scale-[1.02] group-hover:border-primary/40 group-hover:shadow-glow">
        <div className="mb-8 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-secondary">{mode.label}</span>
          <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-primary">{mode.duration}</span>
        </div>
        <h3 className="font-display text-3xl font-bold leading-tight text-on-background">{mode.title}</h3>
        <p className="mt-4 text-sm leading-6 text-on-surface-variant">{mode.summary}</p>
      </GlassCard>
    </Link>
  );
}
