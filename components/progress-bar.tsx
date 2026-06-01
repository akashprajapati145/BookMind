type ProgressBarProps = {
  value: number;
};

export function ProgressBar({ value }: ProgressBarProps) {
  return (
    <div className="h-1 w-full overflow-hidden bg-slate-800">
      <div className="h-full bg-secondary" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}
