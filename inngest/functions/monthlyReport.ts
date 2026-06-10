import { inngest } from "@/inngest/client";
import { createAdminClient } from "@/lib/supabase/server";
import { Resend } from "resend";

export const monthlyReport = inngest.createFunction(
  {
    id: "monthly-report",
    name: "Send Monthly SEO Report",
    triggers: [{ cron: "0 9 1 * *" }],
    retries: 1,
  },

  async ({ step }) => {
    const resend = new Resend(process.env.RESEND_API_KEY!);
    const supabase = await createAdminClient();

    // Fetch all users with active subscriptions
    const { data: users } = await supabase
      .from("users")
      .select("id, email")
      .eq("subscription_status", "active");

    if (!users?.length) return { sent: 0 };

    const thirtyDaysAgo = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000
    ).toISOString();

    let sentCount = 0;

    for (const user of users) {
        // Step 1: get this user's location IDs
        const { data: userLocs } = await supabase
          .from("locations")
          .select("id")
          .eq("user_id", user.id);
        const locIds = (userLocs ?? []).map((l: { id: string }) => l.id);

        // Step 2: get review IDs within those locations (last 30 days)
        const { data: locReviews } = await supabase
          .from("reviews")
          .select("id, star_rating")
          .in("location_id", locIds.length ? locIds : [""])
          .gte("fetched_at", thirtyDaysAgo);

        const allReviewIds = (locReviews ?? []).map((r: { id: string }) => r.id);
        const fiveStarReviewIds = (locReviews ?? [])
          .filter((r: { id: string; star_rating: number }) => r.star_rating === 5)
          .map((r: { id: string }) => r.id);
        const negReviewIds = (locReviews ?? [])
          .filter((r: { id: string; star_rating: number }) => r.star_rating <= 2)
          .map((r: { id: string }) => r.id);

        // Count posted replies (all star ratings)
        const { count: totalReplies } = await supabase
          .from("replies")
          .select("id", { count: "exact", head: true })
          .eq("status", "posted")
          .gte("posted_at", thirtyDaysAgo)
          .in("review_id", allReviewIds.length ? allReviewIds : [""]);

        // Count 5-star replies posted
        const { count: fiveStarReplies } = await supabase
          .from("replies")
          .select("id", { count: "exact", head: true })
          .eq("status", "posted")
          .gte("posted_at", thirtyDaysAgo)
          .in("review_id", fiveStarReviewIds.length ? fiveStarReviewIds : [""]);

        // Count negative reviews alerted
        const negativeReviews = negReviewIds.length;

        // Count locations
        const { count: locationCount } = await supabase
          .from("locations")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id);

        const handled = totalReplies ?? 0;
        const fiveStar = fiveStarReplies ?? 0;
        const negative = negativeReviews ?? 0;
        const locs = locationCount ?? 0;

        if (handled === 0 && negative === 0) return; // Nothing to report

        const emailText = `Last month, we automatically handled ${fiveStar} 5-star reviews and alerted you to ${negative} negative reviews across your ${locs} location${locs !== 1 ? "s" : ""}. Your Google Maps ranking is being actively protected.

In total, ${handled} review response${handled !== 1 ? "s were" : " was"} posted on your behalf.

Log in to view the full audit trail: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard

—
AutoRe Team
Unsubscribe: ${process.env.NEXT_PUBLIC_APP_URL}/settings`;

        try {
          await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL!,
            to: user.email,
            subject: "Your Monthly Google SEO Report",
            text: emailText,
          });
          sentCount++;
        } catch (err) {
          console.error(`Failed to send report to ${user.email}:`, err);
        }
    }

    return { sent: sentCount };
  }
);
