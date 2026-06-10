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
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 pb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-black">
            Reviews Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {pendingReviews.length === 0
              ? "All caught up! No pending replies."
              : `${pendingReviews.length} review${pendingReviews.length !== 1 ? "s" : ""} require your approval`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-full">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-black opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-black"></span>
            </span>
            <span className="text-[11px] font-bold text-black tracking-wide uppercase">
              Monitoring Live
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-gray-450 uppercase tracking-wider">
              Pending Replies {pendingReviews.length > 0 && `(${pendingReviews.length})`}
            </h2>
          </div>
          
          {/* Error state */}
          {error && (
            <div className="alert alert-error mb-4 text-sm" role="alert">
              Failed to load reviews. Please refresh.
            </div>
          )}

          {/* Empty state */}
          {hasLocations && pendingReviews.length === 0 && (
            <div className="text-center py-16 px-4 bg-white border border-gray-200 rounded flex flex-col items-center justify-center shadow-xs">
              <div className="w-14 h-14 bg-gray-100 text-black rounded-full flex items-center justify-center mb-4 border border-gray-200">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <h3 className="font-bold text-lg text-black">All caught up!</h3>
              <p className="text-gray-500 text-sm mt-2 max-w-sm leading-relaxed">
                No pending reviews. We automatically sync your connected Google Business Profiles every hour and draft AI replies.
              </p>
            </div>
          )}

          {/* Review feed */}
          {pendingReviews.length > 0 && (
            <div className="space-y-5">
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

        {/* Sidebar Controls & Stats */}
        <div className="space-y-6">
          {/* Stats Card */}
          <div className="card bg-black text-white border-0 shadow-xs relative overflow-hidden">
            <h3 className="text-[10px] font-bold tracking-wider text-gray-400 uppercase mb-4 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />
              </svg>
              Overview
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/10 rounded p-4 text-center">
                <p className="text-3xl font-extrabold text-white tracking-tight">{pendingReviews.length}</p>
                <p className="text-[10px] text-gray-300 mt-1 font-bold uppercase tracking-wider">Pending</p>
              </div>
              <div className="bg-white/10 rounded p-4 text-center">
                <p className="text-3xl font-extrabold text-white tracking-tight">{postedCount}</p>
                <p className="text-[10px] text-gray-300 mt-1 font-bold uppercase tracking-wider">Posted</p>
              </div>
            </div>
          </div>

          {/* Locations Connection Widget */}
          {!hasLocations ? (
            <div className="card border-dashed border-2 border-gray-300 bg-gray-50 text-center flex flex-col items-center p-6">
              <div className="w-12 h-12 rounded-full bg-gray-100 text-black flex items-center justify-center mb-3 border border-gray-200">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-.778.099-1.533.284-2.253" />
                </svg>
              </div>
              <h3 className="font-bold text-sm text-black mb-1">Connect Location</h3>
              <p className="text-xs text-gray-500 mb-4 max-w-xs leading-relaxed">
                Connect your Google Business Profile to start automatically fetching reviews and drafting replies.
              </p>
              <Link href="/connect" className="btn btn-primary btn-block text-xs py-2 h-10 min-h-0">
                Connect Google Account →
              </Link>
            </div>
          ) : (
            <div className="card bg-white border border-gray-200 shadow-xs">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded bg-gray-100 text-black flex items-center justify-center shrink-0 border border-gray-200">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-black leading-tight">Sync is Active</h3>
                  <p className="text-[10px] text-gray-400 font-bold tracking-wider uppercase">Checking hourly</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                AutoRe automatically reviews new posts, creates drafts, and alerts you instantly of bad feedback.
              </p>
              <Link href="/connect" className="btn btn-outline text-xs py-2 h-10 min-h-0 w-full flex items-center justify-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Manage Locations
              </Link>
            </div>
          )}
        </div>
      </div>
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
