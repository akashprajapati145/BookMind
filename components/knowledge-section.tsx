import { GlassCard } from "@/components/glass-card";

type KnowledgeSectionProps = {
  eyebrow?: string;
  title: string;
  children: React.ReactNode;
  className?: string;
};

export function KnowledgeSection({ eyebrow, title, children, className = "" }: KnowledgeSectionProps) {
  return (
    <GlassCard className={`break-words p-5 md:p-6 ${className}`}>
      {eyebrow ? <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-secondary">{eyebrow}</p> : null}
      <h2 className="break-words font-display text-3xl font-bold leading-tight text-on-background">{title}</h2>
      <div className="mt-5 text-on-surface-variant">{children}</div>
    </GlassCard>
  );
}
