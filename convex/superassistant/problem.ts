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

export type Problem = { id: Id<"problems">; weekId: Id<"weeks">; name: string; instructions: string; solutions: string; mandatory: boolean };

export const list = queryWithAuth({
  args: {
    weekId: v.id("weeks"),
  },
  handler: async (ctx, { weekId }) => {
    
  }
});