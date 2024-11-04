import { v } from "convex/values";
import { queryWithAuth } from "../auth/withAuth";
import { getCourseRegistration } from "../courses";

type Report = {
  id: string;
  type: "exercise" | "chat" | "feedback";
  attemptId: string;
  reason: string;
  message: string | undefined;
};

export const list = queryWithAuth({
  args: {
    courseSlug: v.string(),
  },
  handler: async ({ db, session }, { courseSlug }) => {
    const { course } = await getCourseRegistration(
      db,
      session,
      courseSlug,
      "admin",
    );

    const result: Report[] = [];

    const exerciseReports = await db
      .query("reports")
      .withIndex("by_course", (q) => q.eq("courseId", course._id))
      .collect();

    const chatReports = await db
      .query("chatReports")
      .withIndex("by_course", (q) => q.eq("courseId", course._id))
      .collect();

    const feedbackReports = await db
      .query("feedbackReports")
      .withIndex("by_course", (q) => q.eq("courseId", course._id))
      .collect();

    for (const report of exerciseReports) {
      const message = await db.get(report.messageId);
      result.push({
        id: report._id,
        type: "exercise",
        attemptId: report.attemptId,
        reason: report.reason,
        message: message?.content,
      });
    }

    for (const report of chatReports) {
      const message = await db.get(report.messageId);
      result.push({
        id: report._id,
        type: "chat",
        attemptId: report.chatId,
        reason: report.reason,
        message:
          typeof message?.content === "string" ? message?.content : undefined,
      });
    }

    for (const report of feedbackReports) {
      const message = await db.get(report.messageId);
      result.push({
        id: report._id,
        type: "feedback",
        attemptId: report.feedbackId,
        reason: report.reason,
        message:
          typeof message?.content === "string" ? message?.content : undefined,
      });
    }

    return result;
  },
});
