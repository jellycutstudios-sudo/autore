import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  console.log(`[OAuth Callback] GET request received. Code present: ${!!code}, origin: ${origin}, target next: ${next}`);

  if (code) {
    const cookieStore = await cookies();
    const response = NextResponse.redirect(`${origin}${next}`);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            console.log(`[OAuth Callback] Writing ${cookiesToSet.length} cookies to response headers`);
            cookiesToSet.forEach(({ name, value, options }) => {
              try {
                cookieStore.set(name, value, options);
              } catch (err) {
                // Ignore read-only cookieStore error in GET handlers
              }
              try {
                response.cookies.set(name, value, options);
              } catch (err) {
                console.error(`[OAuth Callback] Failed to set cookie on response for ${name}:`, err);
              }
            });
          },
        },
      }
    );

    console.log(`[OAuth Callback] Exchanging code for session...`);
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      console.log(`[OAuth Callback] Exchange succeeded! Redirecting to ${origin}${next}`);
      return response;
    } else {
      console.error(`[OAuth Callback] Exchange error:`, error);
    }
  }

  console.log(`[OAuth Callback] Authentication failed. Redirecting to /login`);
  return NextResponse.redirect(`${origin}/login?error=Could not authenticate user`);
}
