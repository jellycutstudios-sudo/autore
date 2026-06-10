"use client";

import { useState } from "react";
import { StarRating } from "@/components/StarRating";
import { useRouter } from "next/navigation";

interface ReviewCardProps {
  replyId: string;
  reviewId: string;
  authorName: string;
  starRating: number;
  reviewText: string | null;
  draftText: string | null;
  businessName: string;
  createdAt: string;
}

export function ReviewCard({
  replyId,
  authorName,
  starRating,
  reviewText,
  draftText,
  businessName,
  createdAt,
}: ReviewCardProps) {
  const router = useRouter();
  const [draft, setDraft] = useState(draftText ?? "");
  const [loading, setLoading] = useState(false);
  const [posted, setPosted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isGenerating = !draftText;
  const isLowRating = starRating <= 2;

  async function handlePost() {
    setLoading(true);
    setError(null);

    const res = await fetch("/api/reviews/post-reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ replyId, editedText: draft }),
    });

    if (res.ok) {
      setPosted(true);
      setTimeout(() => router.refresh(), 1200);
    } else {
      const data = await res.json().catch(() => ({ error: "Unknown error" }));
      setError(data.error ?? "Failed to post reply");
    }

    setLoading(false);
  }

  const formattedDate = new Date(createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <article className="card" aria-label={`Review from ${authorName}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <StarRating rating={starRating} size="sm" />
            {isLowRating && (
              <span className="badge badge-danger text-xs">⚠ Needs attention</span>
            )}
          </div>
          <p className="font-semibold text-sm text-black">{authorName}</p>
          <p className="text-xs text-gray-400">{businessName} · {formattedDate}</p>
        </div>
      </div>

      {/* Review text */}
      {reviewText ? (
        <blockquote className="text-sm text-gray-700 leading-relaxed border-l-2 border-gray-200 pl-3 mb-4 italic">
          &ldquo;{reviewText}&rdquo;
        </blockquote>
      ) : (
        <p className="text-sm text-gray-400 italic mb-4">No written review.</p>
      )}

      {/* AI Draft section */}
      <div className="border-t border-gray-100 pt-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            AI Draft Reply
          </span>
          {isGenerating && (
            <span className="text-xs text-gray-400 animate-pulse">
              Generating…
            </span>
          )}
        </div>

        {isGenerating ? (
          <div className="skeleton h-16 w-full" aria-busy="true" />
        ) : (
          <textarea
            id={`draft-${replyId}`}
            className="textarea text-sm"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={4}
            aria-label="Edit reply draft"
            disabled={posted || loading}
          />
        )}
      </div>

      {/* Error alert */}
      {error && (
        <div className="alert alert-error mt-3 text-xs" role="alert">
          {error}
        </div>
      )}

      {/* CTA */}
      {!isGenerating && !posted && (
        <button
          id={`btn-post-reply-${replyId}`}
          type="button"
          onClick={handlePost}
          disabled={loading || !draft.trim()}
          className="btn btn-primary btn-block mt-4"
          aria-label="Post this reply to Google"
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            "Post Reply to Google"
          )}
        </button>
      )}

      {posted && (
        <div className="alert alert-success mt-4 text-sm font-medium flex items-center gap-2">
          <span>✓</span> Reply posted successfully!
        </div>
      )}
    </article>
  );
}
