import {
  internalAction,
  internalMutation,
  internalQuery,
  query,
  mutation,
} from "../_generated/server";
import { ConvexError, v } from "convex/values";
import { Id } from "../_generated/dataModel";
import OpenAI from "openai";
import { internal } from "../_generated/api";
import { queryWithAuth, mutationWithAuth } from "../auth/withAuth";
import { getCourseRegistration } from "../courses";

export type Status = "NOT STARTED" | "IN PROGRESS" | "COMPLETED";
export type Problem = { id: Id<"problems">; weekId: Id<"weeks">; name: string; instructions: string; solutions? : string; mandatory: boolean; status: Status; attemptId?: Id<"saAttempts"> };

export const list = queryWithAuth({
  args: {
    weekId: v.id("weeks"),
  },
  handler: async (ctx, { weekId }) => {
    if (!ctx.session) throw new ConvexError("Not logged in");
    const userId = ctx.session.user._id;

    const problems = await ctx.db
        .query("problems")
        .withIndex("by_week", (x) => x.eq("weekId", weekId))
        .collect();

    const result : Problem[] = [];
    for (const problem of problems) {
        const attempt = await ctx.db
            .query("saAttempts")
            .withIndex("by_key", (x) => x.eq("userId", userId).eq("problemId", problem._id))
            .first();

        result.push({
            id: problem._id,
            weekId: problem.weekId,
            name: problem.name,
            instructions: problem.instructions,
            solutions: problem.solutions,
            mandatory: problem.mandatory,
            status: attempt ? "IN PROGRESS" : "NOT STARTED",
            attemptId: attempt ? attempt._id : undefined,
        });
    }

    return result;
  }
});