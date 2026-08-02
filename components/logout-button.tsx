"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="rounded-full px-3 py-2 text-sm font-semibold text-on-surface-variant hover:bg-white/10 hover:text-on-background"
    >
      Sign Out
    </button>
  );
}
