import { createAdminClient } from "@/lib/supabase/server";

interface GoogleConnection {
  id: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
}

interface RefreshResponse {
  access_token: string;
  expires_in: number;
}

/**
 * Returns a valid Google access token for the given user.
 * If the current token expires within 5 minutes, it uses the refresh_token
 * to obtain a new one, updates the DB, and returns the fresh token.
 */
export async function getValidGoogleToken(userId: string): Promise<string> {
  const supabase = await createAdminClient();

  const { data: connection, error } = await supabase
    .from("google_connections")
    .select("id, access_token, refresh_token, token_expires_at")
    .eq("user_id", userId)
    .single<GoogleConnection>();

  if (error || !connection) {
    throw new Error(`No Google connection found for user ${userId}`);
  }

  const expiresAt = new Date(connection.token_expires_at).getTime();
  const fiveMinutesMs = 5 * 60 * 1000;
  const isExpiringSoon = Date.now() >= expiresAt - fiveMinutesMs;

  if (!isExpiringSoon) {
    return connection.access_token;
  }

  // Token is expiring — refresh it
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: connection.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  if (!tokenRes.ok) {
    const body = await tokenRes.text();
    throw new Error(`Google token refresh failed: ${body}`);
  }

  const refreshed = (await tokenRes.json()) as RefreshResponse;
  const newExpiresAt = new Date(
    Date.now() + refreshed.expires_in * 1000
  ).toISOString();

  await supabase
    .from("google_connections")
    .update({
      access_token: refreshed.access_token,
      token_expires_at: newExpiresAt,
    })
    .eq("id", connection.id);

  return refreshed.access_token;
}
