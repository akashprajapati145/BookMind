import Link from "next/link";

export function DemoBanner() {
  return (
    <div className="sticky top-0 z-50 flex items-center justify-between gap-4 bg-primary/90 px-5 py-3 backdrop-blur-sm">
      <p className="text-sm font-medium text-on-primary">
        You are viewing a read-only demo. Sign up to upload your own books and generate knowledge.
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
  );
}
