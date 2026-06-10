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

  const initials = authorName
    ? authorName
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U";

  const borderQuoteColor = isLowRating ? "border-black" : "border-gray-200";

  return (
    <article className="card" aria-label={`Review from ${authorName}`}>
      {/* Header with Avatar and details */}
      <div className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 rounded bg-black text-white font-extrabold text-xs flex items-center justify-center shrink-0 select-none">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-bold text-sm text-black truncate">{authorName}</p>
            <span className="text-[10px] text-gray-400 font-semibold">{formattedDate}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <StarRating rating={starRating} size="sm" />
            <span className="text-xs text-gray-500">· {businessName}</span>
            {isLowRating && (
              <span className="badge badge-danger text-[9px] py-0.5 px-2">⚠ Needs attention</span>
            )}
          </div>
        </div>
      </div>

      {/* Review text */}
      {reviewText ? (
        <blockquote className={`text-sm text-gray-700 leading-relaxed border-l-2 ${borderQuoteColor} pl-3 mb-4 italic`}>
          &ldquo;{reviewText}&rdquo;
        </blockquote>
      ) : (
        <p className="text-sm text-gray-400 italic mb-4 pl-3 border-l-2 border-gray-200">No written review.</p>
      )}

      {/* AI Draft section */}
      <div className="border-t border-gray-100 pt-4 mt-2">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-black flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-black" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
            AI Draft Reply
          </span>
          {isGenerating && (
            <span className="text-[10px] font-bold text-gray-400 animate-pulse">
              Generating draft…
            </span>
          )}
        </div>

        {isGenerating ? (
          <div className="skeleton h-16 w-full" aria-busy="true" />
        ) : (
          <textarea
            id={`draft-${replyId}`}
            className="textarea text-sm bg-gray-50/50"
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
          className="btn btn-primary btn-block mt-4 flex items-center justify-center gap-2"
          aria-label="Post this reply to Google"
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <span>Post Reply to Google</span>
              <svg className="w-4 h-4 opacity-80" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </>
          )}
        </button>
      )}

      {posted && (
        <div className="alert alert-success mt-4 text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm">
          <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          Reply posted successfully!
        </div>
      )}
    </article>
  );
}
