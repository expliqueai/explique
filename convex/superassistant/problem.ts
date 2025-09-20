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

export type Problem = { id: Id<"problems">; weekId: Id<"weeks">; name: string; instructions: string; solutions?: string; mandatory: boolean; status: "NOT STARTED" | "IN PROGRESS" | "VALIDATED" };

export const list = queryWithAuth({
  args: {
    weekId: v.id("weeks"),
  },
  handler: async (ctx, { weekId }) => {
    
  }
});



// ______________ new functions admin 

export const listByWeek = queryWithAuth({
  args: { weekId: v.id("weeks") },
  handler: async (ctx, { weekId }) => {
    return await ctx.db
      .query("problems")
      .withIndex("by_week", (q) => q.eq("weekId", weekId))
      .collect();
  },
});


export const createProblem = mutationWithAuth({
  args: {
    weekId: v.id("weeks"),
    name: v.string(),
    instructions: v.string(),
    solutions: v.optional(v.string()),
    mandatory: v.boolean(),
  },
  handler: async (ctx, { weekId, name, instructions, solutions, mandatory }) => {
    return await ctx.db.insert("problems", {
      weekId,
      name,
      instructions,
      solutions,
      mandatory,
    });
  },
});

export const updateProblem = mutationWithAuth({
  args: {
    problemId: v.id("problems"),
    name: v.string(),
    instructions: v.string(),
    solutions: v.optional(v.string()),
    mandatory: v.boolean(),
  },
  handler: async (ctx, { problemId, name, instructions, solutions, mandatory }) => {
    await ctx.db.patch(problemId, {
      name,
      instructions,
      solutions,
      mandatory,
    });
  },
});


export const deleteProblem = mutationWithAuth({
  args: { problemId: v.id("problems") },
  handler: async (ctx, { problemId }) => {
    await ctx.db.delete(problemId);
  },
});


export const toggleMandatory = mutationWithAuth({
  args: { problemId: v.id("problems") },
  handler: async (ctx, { problemId }) => {
    const prob = await ctx.db.get(problemId);
    if (!prob) throw new Error("Problem not found");
    await ctx.db.patch(problemId, { mandatory: !prob.mandatory });
  },
});


export const listProblemsByWeek = queryWithAuth({
  args: { weekId: v.id("weeks") },
  handler: async (ctx, { weekId }) => {
    return await ctx.db
      .query("problems")
      .withIndex("by_week", (q) => q.eq("weekId", weekId))
      .collect();
  },
});

export const get = queryWithAuth({
  args: { problemId: v.id("problems") },
  handler: async (ctx, { problemId }) => {
    const p = await ctx.db.get(problemId);
    if (!p) throw new ConvexError("Problem not found");

    return {
      id: p._id,
      weekId: p.weekId,
      name: p.name ?? "",
      instructions: p.instructions ?? "",
      solutions: p.solutions ?? undefined,
      mandatory: !!p.mandatory,
    };
  },
});