import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public paths — never gate these
  const PUBLIC_PATHS = [
    "/login",
    "/pricing",
    "/api/auth",
    "/api/webhooks",
    "/api/inngest",
    "/_next",
    "/favicon.ico",
  ];

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Build a response we can mutate cookies on
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  // Create a lightweight Supabase client that works in the proxy context
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Validate session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Not logged in → send to login
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Check subscription status from users table
  const { data: userData } = await supabase
    .from("users")
    .select("subscription_status")
    .eq("id", user.id)
    .single();

  const isSubscribed = userData?.subscription_status === "active";

  // Logged in but no subscription → redirect to pricing
  // (Allow /pricing itself through if they're somehow here)
  if (!isSubscribed && !pathname.startsWith("/pricing") && process.env.NODE_ENV === "production") {
    return NextResponse.redirect(new URL("/pricing", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
