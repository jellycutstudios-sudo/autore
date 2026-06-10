import { inngest } from "@/inngest/client";
import { createAdminClient } from "@/lib/supabase/server";
import OpenAI from "openai";

export const generateReply = inngest.createFunction(
  {
    id: "generate-reply",
    name: "Generate AI Reply for Review",
    triggers: [{ event: "review/created" }],
    retries: 2,
    concurrency: { limit: 10 },
  },

  async ({ event, step }) => {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

    const { reviewId, locationId } = event.data as {
      reviewId: string;
      locationId: string;
      userId: string;
      starRating: number;
    };

    const supabase = await createAdminClient();

    // 1. Fetch the review
    const { data: review } = await supabase
      .from("reviews")
      .select("author_name, star_rating, review_text")
      .eq("id", reviewId)
      .single();

    if (!review) {
      throw new Error(`Review ${reviewId} not found`);
    }

    // 2. Fetch the location's tone guidelines
    const { data: location } = await supabase
      .from("locations")
      .select("tone_guidelines, business_name")
      .eq("id", locationId)
      .single();

    const tone =
      location?.tone_guidelines ??
      "Professional, friendly, and appreciative. Keep it concise.";
    const businessName = location?.business_name ?? "our business";

    // 3. Build the AI prompt
    const starEmoji = "⭐".repeat(review.star_rating);
    const reviewBody = review.review_text
      ? `"${review.review_text}"`
      : "(No written review text — just a star rating)";

    const systemPrompt = `You are a polite, professional assistant managing online reviews for ${businessName}. Write a concise, 2-3 sentence reply to the following customer review. Do not include URLs or hashtags. Vary your vocabulary so responses do not look automated. Match this tone: ${tone}`;

    const userPrompt = `Customer: ${review.author_name}
Rating: ${starEmoji} (${review.star_rating}/5)
Review: ${reviewBody}

Write the reply directly — no quotes, no "Reply:" prefix.`;

    // 4. Call OpenAI
    const draftText = await step.run("call-openai", async () => {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 200,
        temperature: 0.8,
      });
      return completion.choices[0]?.message?.content?.trim() ?? "";
    });

    if (!draftText) {
      throw new Error("OpenAI returned empty response");
    }

    // 5. Save draft to replies table
    await step.run("save-draft", async () => {
      await supabase.from("replies").upsert(
        {
          review_id: reviewId,
          draft_text: draftText,
          status: "draft",
        },
        { onConflict: "review_id" }
      );
    });

    return { reviewId, draftLength: draftText.length };
  }
);
