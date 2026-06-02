type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export function PageHeader({ eyebrow, title, description, action }: PageHeaderProps) {
  return (
    <section className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
      <div className="max-w-3xl">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-secondary">{eyebrow}</p>
        <h1 className="break-words font-display text-4xl font-bold leading-tight text-on-background md:text-6xl">{title}</h1>
        {description ? <p className="mt-4 max-w-2xl break-words text-base leading-7 text-on-surface-variant">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </section>
  );
}
