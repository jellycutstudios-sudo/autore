import { createClient } from "@/lib/supabase/server";
import { ReviewCard } from "@/components/ReviewCard";
import Link from "next/link";

interface DraftReview {
  id: string;
  author_name: string;
  star_rating: number;
  review_text: string | null;
  created_at: string;
  location: {
    business_name: string;
  };
  replies: {
    id: string;
    draft_text: string | null;
    status: string;
  }[];
}

export const revalidate = 60; // Revalidate every 60s for fresh data

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // First: fetch this user's location IDs as a plain array
  const { data: userLocations } = await supabase
    .from("locations")
    .select("id")
    .eq("user_id", user!.id);

  const locationIds = (userLocations ?? []).map((l: { id: string }) => l.id);

  // Fetch pending draft reviews (joined with location and reply)
  const { data: reviews, error } =
    locationIds.length === 0
      ? { data: [], error: null }
      : await supabase
          .from("reviews")
          .select(
            `
      id,
      author_name,
      star_rating,
      review_text,
      created_at,
      location:locations(business_name),
      replies(id, draft_text, status)
    `
          )
          .in("location_id", locationIds)
          .order("created_at", { ascending: false })
          .limit(50);

  // Filter to show only pending drafts (draft status or no reply yet)
  const pendingReviews = (reviews as unknown as DraftReview[])?.filter(
    (r) =>
      !r.replies.length ||
      r.replies[0]?.status === "draft" ||
      r.replies[0]?.status === "failed"
  ) ?? [];

  const postedCount = (reviews as unknown as DraftReview[])?.filter(
    (r) => r.replies[0]?.status === "posted"
  ).length ?? 0;

  const hasLocations = await checkHasLocations(user!.id, supabase);

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black tracking-tight text-black">
          Pending Replies
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {pendingReviews.length === 0
            ? "You're all caught up! 🎉"
            : `${pendingReviews.length} review${pendingReviews.length !== 1 ? "s" : ""} waiting for your approval`}
        </p>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-black">{pendingReviews.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Pending</p>
        </div>
        <div className="border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-black">{postedCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">Posted (recent)</p>
        </div>
      </div>

      {/* No locations prompt */}
      {!hasLocations && (
        <div className="alert alert-info mb-6">
          <p className="font-semibold text-sm mb-1">Connect a location first</p>
          <p className="text-xs text-gray-600 mb-3">
            Link your Google Business Profile to start auto-fetching reviews.
          </p>
          <Link href="/connect" className="btn btn-primary text-sm py-2 px-4 min-h-0 h-10">
            Connect Google Business →
          </Link>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="alert alert-error mb-4 text-sm">
          Failed to load reviews. Please refresh.
        </div>
      )}

      {/* Empty state */}
      {hasLocations && pendingReviews.length === 0 && (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">✓</div>
          <h2 className="font-bold text-lg text-black">All caught up!</h2>
          <p className="text-gray-500 text-sm mt-1">
            No pending reviews. Check back after the next hourly sync.
          </p>
        </div>
      )}

      {/* Review feed */}
      {pendingReviews.length > 0 && (
        <div className="space-y-4">
          {pendingReviews.map((review) => (
            <ReviewCard
              key={review.id}
              reviewId={review.id}
              replyId={review.replies[0]?.id ?? ""}
              authorName={review.author_name}
              starRating={review.star_rating}
              reviewText={review.review_text}
              draftText={review.replies[0]?.draft_text ?? null}
              businessName={review.location?.business_name ?? "Your Business"}
              createdAt={review.created_at}
            />
          ))}
        </div>
      )}
    </div>
  );
}

async function checkHasLocations(
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
): Promise<boolean> {
  const { count } = await supabase
    .from("locations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  return (count ?? 0) > 0;
}
