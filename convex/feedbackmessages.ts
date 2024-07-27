import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { queryWithAuth } from "./auth/withAuth";


export const insertMessage = internalMutation({
    args: {
        feedbackId: v.id("feedbacks"),
        role: v.union(v.literal("user"), v.literal("system"), v.literal("assistant")),
        content: v.union(v.string(), v.array(v.union(
            v.object({ 
                type:v.literal("text"), 
                text:v.string(),
            }), v.object({
                type:v.literal("image_url"),
                image_url:v.object({ url:v.string() }),
            })
        ))),
        appearance: v.optional(v.union(v.literal("finished"), v.literal("feedback"), v.literal("typing"), v.literal("error"))),
    },
    handler: async ({ db }, { feedbackId, role, content }) => {
        return await db.insert("feedbackMessages", { feedbackId, content, role });
    },
});

export const getFeedback = queryWithAuth({
    args: {
        feedbackId: v.id("feedbacks"),
    },
    handler: async (ctx, { feedbackId }) => {
        const feedback = await ctx
                                .db
                                .query("feedbackMessages")
                                .withIndex("by_feedback", (x) => x.eq("feedbackId", feedbackId))
                                .filter((x) => x.eq(x.field("role"), "assistant"))
                                .first()

        if (feedback === null || typeof feedback.content !== "string") return undefined;
        return feedback.content;
    },
});
