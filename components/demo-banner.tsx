import Link from "next/link";

export function DemoBanner() {
  return (
    <div className="sticky top-0 z-50 bg-primary/90 px-5 py-3 backdrop-blur-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-on-primary">
          <span className="sm:hidden">Read-only demo — sign up to upload your own books.</span>
          <span className="hidden sm:inline">You are viewing a read-only demo. Sign up to upload your own books and generate knowledge.</span>
        </p>
        <div className="flex shrink-0 gap-2">
          <Link
            href="/auth/login"
            className="rounded-full border border-on-primary/30 px-4 py-1.5 text-sm font-bold text-on-primary hover:bg-white/10"
          >
            Sign In
          </Link>
          <Link
            href="/auth/signup"
            className="rounded-full bg-white px-4 py-1.5 text-sm font-bold text-primary hover:bg-white/90"
          >
            Sign Up Free
          </Link>
        </div>
      </div>
    </div>
  );
}
