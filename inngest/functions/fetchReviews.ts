import { inngest } from "@/inngest/client";
import { createAdminClient } from "@/lib/supabase/server";
import { getValidGoogleToken } from "@/lib/google/getValidGoogleToken";

interface GoogleReview {
  name: string;           // e.g. "accounts/.../locations/.../reviews/..."
  reviewId: string;
  reviewer: { displayName: string };
  starRating: "ONE" | "TWO" | "THREE" | "FOUR" | "FIVE";
  comment?: string;
  createTime: string;     // ISO 8601
  reviewReply?: { comment: string };
}

const STAR_MAP: Record<string, number> = {
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
};

/**
 * Exponential backoff fetch — retries on HTTP 429 up to maxRetries times.
 */
async function fetchWithBackoff(
  url: string,
  options: RequestInit,
  maxRetries = 5
): Promise<Response> {
  let delay = 1000;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(url, options);
    if (res.status !== 429) return res;
    if (attempt === maxRetries) return res;
    console.warn(`Rate limited (429). Retry ${attempt + 1} in ${delay}ms…`);
    await new Promise((r) => setTimeout(r, delay));
    delay *= 2 + Math.random(); // jitter
  }
  throw new Error("Exceeded max retries");
}

export const fetchReviews = inngest.createFunction(
  {
    id: "fetch-reviews",
    name: "Fetch Google Reviews (Hourly)",
    triggers: [{ cron: "0 * * * *" }],
    concurrency: { limit: 5 },
    retries: 3,
  },

  async ({ step }) => {
    const supabase = await createAdminClient();

    // 1. Fetch all active locations
    const { data: locations, error: locError } = await supabase
      .from("locations")
      .select("id, user_id, google_location_id, auto_reply_enabled");

    if (locError || !locations?.length) {
      console.log("No locations to process");
      return { processed: 0 };
    }

    let totalNewReviews = 0;

    for (const location of locations) {
      await step.run(`fetch-location-${location.id}`, async () => {
        try {
          // 2. Get a valid token for this user
          const accessToken = await getValidGoogleToken(location.user_id);

          // 3. Fetch unreplied reviews from Google Business Profile API
          const apiUrl = `https://mybusiness.googleapis.com/v4/${location.google_location_id}/reviews?pageSize=50`;
          const res = await fetchWithBackoff(apiUrl, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });

          if (!res.ok) {
            const body = await res.text();
            console.error(
              `Google API error for location ${location.id}: ${res.status} ${body}`
            );
            return;
          }

          const json = (await res.json()) as { reviews?: GoogleReview[] };
          const reviews = json.reviews ?? [];

          // Filter unreplied reviews only
          const unreplied = reviews.filter((r) => !r.reviewReply);

          for (const review of unreplied) {
            const starRating = STAR_MAP[review.starRating] ?? 3;

            // 4. Upsert review into DB (idempotent on google_review_id)
            const { data: insertedReview, error: insertError } = await supabase
              .from("reviews")
              .upsert(
                {
                  location_id: location.id,
                  google_review_id: review.reviewId,
                  author_name: review.reviewer.displayName,
                  star_rating: starRating,
                  review_text: review.comment ?? null,
                  created_at: review.createTime,
                },
                { onConflict: "google_review_id", ignoreDuplicates: true }
              )
              .select("id, star_rating")
              .single();

            if (insertError || !insertedReview) continue;

            totalNewReviews++;

            // 5. Emit events for downstream processing
            await inngest.send({
              name: "review/created",
              data: {
                reviewId: insertedReview.id,
                locationId: location.id,
                userId: location.user_id,
                starRating,
              },
            });

            // 6. Emit SMS alert event for bad reviews (1–2 stars)
            if (starRating <= 2) {
              await inngest.send({
                name: "review/bad-rating",
                data: {
                  reviewId: insertedReview.id,
                  userId: location.user_id,
                  authorName: review.reviewer.displayName,
                  starRating,
                },
              });
            }
          }
        } catch (err) {
          console.error(`Error processing location ${location.id}:`, err);
        }
      });
    }

    return { processed: locations.length, newReviews: totalNewReviews };
  }
);
