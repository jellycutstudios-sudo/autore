import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getValidGoogleToken } from "@/lib/google/getValidGoogleToken";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { replyId, editedText } = (await request.json()) as {
    replyId: string;
    editedText?: string;
  };

  if (!replyId) {
    return NextResponse.json({ error: "replyId is required" }, { status: 400 });
  }

  const adminSupabase = await createAdminClient();

  // Step 1: fetch the reply
  const { data: reply } = await adminSupabase
    .from("replies")
    .select("id, draft_text, review_id")
    .eq("id", replyId)
    .single();

  if (!reply) {
    return NextResponse.json({ error: "Reply not found" }, { status: 404 });
  }

  // Step 2: fetch the review
  const { data: review } = await adminSupabase
    .from("reviews")
    .select("id, google_review_id, location_id")
    .eq("id", reply.review_id)
    .single();

  if (!review) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }

  // Step 3: fetch the location and verify ownership
  const { data: location } = await adminSupabase
    .from("locations")
    .select("id, user_id, google_location_id")
    .eq("id", review.location_id)
    .single();

  if (!location) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }

  if (location.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const replyText = editedText?.trim() || reply.draft_text;

  if (!replyText) {
    return NextResponse.json(
      { error: "No reply text available" },
      { status: 400 }
    );
  }

  // Get a valid Google access token
  let accessToken: string;
  try {
    accessToken = await getValidGoogleToken(user.id);
  } catch (err) {
    return NextResponse.json(
      { error: "Google account not connected", details: String(err) },
      { status: 400 }
    );
  }

  const apiUrl = `https://mybusiness.googleapis.com/v4/${location.google_location_id}/reviews/${review.google_review_id}/reply`;

  const googleRes = await fetch(apiUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ comment: replyText }),
  });

  if (!googleRes.ok) {
    const errorBody = await googleRes.text();
    console.error("Google post reply failed:", errorBody);

    await adminSupabase
      .from("replies")
      .update({
        status: "failed",
        google_error_log: errorBody,
      })
      .eq("id", replyId);

    return NextResponse.json(
      { error: "Failed to post to Google", details: errorBody },
      { status: 502 }
    );
  }

  // Success — update reply record
  await adminSupabase
    .from("replies")
    .update({
      final_posted_text: replyText,
      status: "posted",
      posted_at: new Date().toISOString(),
      google_error_log: null,
    })
    .eq("id", replyId);

  return NextResponse.json({ success: true });
}
