import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    console.error("Google OAuth error:", error);
    return NextResponse.redirect(
      new URL("/connect?error=google_denied", request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/connect?error=no_code", request.url)
    );
  }

  // Get the logged-in Supabase user
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Exchange code for tokens
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google-business/callback`;
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    console.error("Google token exchange failed:", text);
    return NextResponse.redirect(
      new URL("/connect?error=token_exchange_failed", request.url)
    );
  }

  const tokens = (await tokenRes.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    token_type: string;
    id_token?: string;
  };

  if (!tokens.refresh_token) {
    console.error("No refresh_token received — did you set prompt=consent?");
    return NextResponse.redirect(
      new URL("/connect?error=no_refresh_token", request.url)
    );
  }

  // Get Google account info
  const userInfoRes = await fetch(
    "https://www.googleapis.com/oauth2/v3/userinfo",
    { headers: { Authorization: `Bearer ${tokens.access_token}` } }
  );
  const userInfo = (await userInfoRes.json()) as { sub: string; email?: string };

  const tokenExpiresAt = new Date(
    Date.now() + tokens.expires_in * 1000
  ).toISOString();

  // Upsert into google_connections using admin client (bypass RLS)
  const adminSupabase = await createAdminClient();
  const { error: upsertError } = await adminSupabase
    .from("google_connections")
    .upsert(
      {
        user_id: user.id,
        google_account_id: userInfo.sub,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: tokenExpiresAt,
      },
      { onConflict: "user_id,google_account_id" }
    );

  if (upsertError) {
    console.error("Failed to save Google connection:", upsertError);
    return NextResponse.redirect(
      new URL("/connect?error=db_error", request.url)
    );
  }

  return NextResponse.redirect(new URL("/connect?success=true", request.url));
}
