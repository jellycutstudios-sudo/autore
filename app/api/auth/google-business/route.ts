import { redirect } from "next/navigation";

/**
 * Initiates the Google Business Profile OAuth flow.
 * Requests offline access (refresh_token) and forces consent prompt.
 */
export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google-business/callback`;

  const scopes = [
    "https://www.googleapis.com/auth/business.manage",
    "openid",
    "email",
  ].join(" ");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopes,
    access_type: "offline",   // ← ensures we get a refresh_token
    prompt: "consent",        // ← forces consent every time (required for refresh_token)
    include_granted_scopes: "true",
  });

  redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}
