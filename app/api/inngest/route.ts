import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { fetchReviews } from "@/inngest/functions/fetchReviews";
import { generateReply } from "@/inngest/functions/generateReply";
import { sendAlertEmail } from "@/inngest/functions/sendAlertEmail";
import { monthlyReport } from "@/inngest/functions/monthlyReport";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [fetchReviews, generateReply, sendAlertEmail, monthlyReport],
});
