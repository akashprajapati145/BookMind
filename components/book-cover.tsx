type BookCoverProps = {
  title: string;
  author: string;
  className?: string;
};

export function BookCover({ title, author, className = "" }: BookCoverProps) {
  return (
    <div
      className={`relative aspect-[2/3] overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-300 via-slate-800 to-emerald-300 shadow-2xl ${className}`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.32),transparent_9rem),linear-gradient(160deg,rgba(2,6,23,0.18),rgba(2,6,23,0.82))]" />
      <div className="absolute inset-x-0 top-0 h-20 bg-white/10 blur-2xl" />
      <div className="relative flex h-full flex-col justify-between p-5">
        <div className="text-xs font-bold uppercase tracking-[0.22em] text-slate-950/80">BookMind</div>
        <div>
          <h3 className="break-words font-display text-3xl font-bold leading-none text-white drop-shadow md:text-4xl">{title}</h3>
          <p className="mt-4 break-words text-sm font-semibold uppercase tracking-[0.18em] text-emerald-100">{author}</p>
        </div>
      </div>
    </div>
  );
}
