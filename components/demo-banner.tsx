import Link from "next/link";

export function DemoBanner() {
  return (
    <div className="sticky top-0 z-50 bg-primary/90 px-4 py-2.5 backdrop-blur-sm sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-sm font-medium text-on-primary">
          <span className="md:hidden">Read-only demo.</span>
          <span className="hidden md:inline">You are viewing a read-only demo — sign up to upload your own books.</span>
        </p>
        <div className="flex shrink-0 gap-2">
          <Link
            href="/auth/login"
            className="rounded-full border border-on-primary/30 px-3 py-1.5 text-xs font-bold text-on-primary hover:bg-white/10 sm:px-4 sm:text-sm"
          >
            Sign In
          </Link>
          <Link
            href="/auth/signup"
            className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-primary hover:bg-white/90 sm:px-4 sm:text-sm"
          >
            Sign Up Free
          </Link>
        </div>
      </div>
    </div>
  );
}
