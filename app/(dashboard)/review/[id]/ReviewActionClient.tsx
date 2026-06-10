"use client";

import { useState } from "react";
import { StarRating } from "@/components/StarRating";
import { useRouter } from "next/navigation";

interface ReviewActionClientProps {
  replyId: string;
  reviewId: string;
  authorName: string;
  starRating: number;
  reviewText: string | null;
  draftText: string | null;
  businessName: string;
  createdAt: string;
}

export function ReviewActionClient({
  replyId,
  authorName,
  starRating,
  reviewText,
  draftText,
  businessName,
  createdAt,
}: ReviewActionClientProps) {
  const router = useRouter();
  const [draft, setDraft] = useState(draftText ?? "");
  const [loading, setLoading] = useState(false);
  const [posted, setPosted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleApprove() {
    setLoading(true);
    setError(null);

    const res = await fetch("/api/reviews/post-reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ replyId, editedText: draft }),
    });

    if (res.ok) {
      setPosted(true);
    } else {
      const data = await res.json().catch(() => ({ error: "Unknown error" }));
      setError(data.error ?? "Failed to post reply");
    }

    setLoading(false);
  }

  const formattedDate = new Date(createdAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  if (posted) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">✓</div>
        <h2 className="text-xl font-black text-black mb-2">Reply Posted!</h2>
        <p className="text-gray-500 text-sm">
          Your response has been published to Google.
        </p>
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="btn btn-outline mt-6"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Warning banner for low ratings */}
      {starRating <= 2 && (
        <div className="bg-black text-white rounded-xl p-4 mb-6 flex items-start gap-3">
          <span className="text-2xl mt-0.5" aria-hidden="true">⚠️</span>
          <div>
            <p className="font-bold text-sm">Negative Review Alert</p>
            <p className="text-xs text-gray-300 mt-0.5">
              This review needs a thoughtful response. Your reply is ready below.
            </p>
          </div>
        </div>
      )}

      {/* Review card */}
      <div className="card mb-6">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <StarRating rating={starRating} size="lg" />
            <p className="font-semibold text-base text-black mt-1">{authorName}</p>
            <p className="text-xs text-gray-400">{businessName} · {formattedDate}</p>
          </div>
        </div>

        {reviewText ? (
          <blockquote className="text-gray-700 leading-relaxed border-l-2 border-gray-200 pl-3 italic">
            &ldquo;{reviewText}&rdquo;
          </blockquote>
        ) : (
          <p className="text-gray-400 italic text-sm">No written review.</p>
        )}
      </div>

      {/* AI Draft */}
      <div className="mb-6">
        <label htmlFor="review-draft" className="label text-black font-bold text-base mb-3 block">
          AI-Generated Reply
        </label>
        {draftText === null ? (
          <div className="space-y-2">
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-4/5" />
            <div className="skeleton h-4 w-3/5" />
            <p className="text-xs text-gray-400 mt-2 text-center animate-pulse">
              AI is generating your reply…
            </p>
          </div>
        ) : (
          <textarea
            id="review-draft"
            className="textarea text-base leading-relaxed"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={6}
            placeholder="Edit the AI reply before posting…"
          />
        )}
        <p className="text-xs text-gray-400 mt-2">
          You can edit this reply before posting. It will appear publicly on Google.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="alert alert-error mb-4" role="alert">
          {error}
        </div>
      )}

      {/* Approve CTA */}
      {draftText !== null && (
        <button
          id="btn-approve-and-post"
          type="button"
          onClick={handleApprove}
          disabled={loading || !draft.trim()}
          className="btn btn-primary btn-block btn-lg"
        >
          {loading ? (
            <>
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Posting to Google…
            </>
          ) : (
            "Approve & Post to Google"
          )}
        </button>
      )}
    </div>
  );
}
