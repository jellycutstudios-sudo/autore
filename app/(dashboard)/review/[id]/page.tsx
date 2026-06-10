import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ReviewActionClient } from "./ReviewActionClient";
import type { Metadata } from "next";

interface ReviewPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: ReviewPageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Review Response — AutoRe`,
    description: `Review and approve the AI-generated reply for review ${id}`,
  };
}

export default async function ReviewActionPage({ params }: ReviewPageProps) {
  // params is a Promise in Next.js 16
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch review with location and reply (verify ownership via locations)
  const { data: review } = await supabase
    .from("reviews")
    .select(
      `
      id,
      author_name,
      star_rating,
      review_text,
      created_at,
      location:locations(
        id,
        user_id,
        business_name
      ),
      replies(
        id,
        draft_text,
        status
      )
    `
    )
    .eq("id", id)
    .single();

  if (!review) notFound();

  // Type assertion for joined data
  const location = review.location as unknown as {
    id: string;
    user_id: string;
    business_name: string;
  };
  const replies = review.replies as unknown as {
    id: string;
    draft_text: string | null;
    status: string;
  }[];

  // Verify the current user owns this review's location
  if (location.user_id !== user?.id) notFound();

  const reply = replies[0];

  return (
    <div className="min-h-screen bg-white">
      {/* Compact nav */}
      <header className="sticky top-0 bg-white border-b border-gray-200 z-10 safe-top">
        <div className="page-container flex items-center justify-between h-14">
          <span className="font-black text-lg text-black">AutoRe</span>
          <span className="badge badge-danger text-xs">
            {review.star_rating}⭐ Review
          </span>
        </div>
      </header>

      <main className="page-container py-6 safe-bottom">
        <ReviewActionClient
          reviewId={review.id}
          replyId={reply?.id ?? ""}
          authorName={review.author_name}
          starRating={review.star_rating}
          reviewText={review.review_text}
          draftText={reply?.draft_text ?? null}
          businessName={location.business_name}
          createdAt={review.created_at}
        />
      </main>
    </div>
  );
}
