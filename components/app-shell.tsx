import Link from "next/link";
import { routes } from "@/lib/routes";

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-6 px-5 py-4 md:px-16">
          <Link href={routes.home} className="flex flex-col">
            <span className="font-display text-2xl font-bold leading-none text-on-background">BookMind</span>
            <span className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-on-surface-variant">
              Learn any book
            </span>
          </Link>
          <nav className="flex items-center gap-2 text-sm font-semibold text-on-surface-variant">
            <Link className="rounded-full px-3 py-2 hover:bg-white/10 hover:text-on-background" href={routes.library}>
              Library
            </Link>
            <Link className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-on-primary" href={routes.upload}>
              Upload
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-[1440px] px-5 py-8 md:px-16 md:py-12">{children}</main>
    </div>
  );
}
