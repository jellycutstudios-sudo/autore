import { inngest } from "@/inngest/client";
import { createAdminClient } from "@/lib/supabase/server";
import { Resend } from "resend";

export const sendAlertEmail = inngest.createFunction(
  {
    id: "send-alert-email",
    name: "Send Email Alert for Bad Review",
    triggers: [{ event: "review/bad-rating" }],
    retries: 2,
  },

  async ({ event }) => {
    const resend = new Resend(process.env.RESEND_API_KEY!);
    const { reviewId, userId, authorName, starRating } = event.data as {
      reviewId: string;
      userId: string;
      authorName: string;
      starRating: number;
    };

    const supabase = await createAdminClient();

    // Get user's email
    const { data: user } = await supabase
      .from("users")
      .select("email")
      .eq("id", userId)
      .single();

    if (!user?.email) {
      console.log(`User ${userId} has no email — skipping email alert`);
      return { skipped: true, reason: "no_email" };
    }

    // Generate a Supabase magic link OTP redirecting to the review action page
    const { data: magicLinkData, error: magicLinkError } =
      await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: user.email,
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/review/${reviewId}`,
        },
      });

    if (magicLinkError || !magicLinkData?.properties?.action_link) {
      console.error("Failed to generate magic link:", magicLinkError);
      return { error: "magic_link_failed" };
    }

    const magicLink = magicLinkData.properties.action_link;
    const starEmoji = starRating === 1 ? "1⭐" : "2⭐";
    const subject = `🚨 New ${starEmoji} Review from ${authorName}`;
    const body = `Hi there,

You received a new ${starRating}-star review from ${authorName}.

Click the link below to review and approve the AI-generated response:
${magicLink}

Best,
AutoRe Team`;

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: user.email,
      subject,
      text: body,
    });

    return { sent: true, to: user.email };
  }
);
