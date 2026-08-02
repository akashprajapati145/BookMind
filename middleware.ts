import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        }
      }
    }
  );

  // Refresh the session — required for Server Components to read auth state
  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  // On auth pages: redirect logged-in users to home
  if (pathname.startsWith("/auth")) {
    if (user) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return supabaseResponse;
  }

  // All other routes require authentication
  if (!user) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Skip Next.js internals, static assets, and public images
    "/((?!_next/static|_next/image|favicon.ico|assets/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"
  ]
};
