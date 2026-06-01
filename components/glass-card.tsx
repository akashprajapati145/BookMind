type GlassCardProps = {
  children: React.ReactNode;
  className?: string;
};

export function GlassCard({ children, className = "" }: GlassCardProps) {
  return <div className={`glass rounded-2xl ${className}`}>{children}</div>;
}
