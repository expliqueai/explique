import { mutationWithAuth, queryWithAuth } from "../auth/withAuth";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";

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
    number: v.string(),
    statement: v.string(),
    solution: v.optional(v.string()),
    mandatory: v.boolean(),
  },
  handler: async (ctx, { weekId, number, statement, solution, mandatory }) => {
    return await ctx.db.insert("problems", {
      weekId,
      number,
      statement,
      solution,
      mandatory,
    });
  },
});

export const updateProblem = mutationWithAuth({
  args: {
    problemId: v.id("problems"),
    number: v.string(),
    statement: v.string(),
    solution: v.optional(v.string()),
    mandatory: v.boolean(),
  },
  handler: async (ctx, { problemId, number, statement, solution, mandatory }) => {
    await ctx.db.patch(problemId, {
      number,
      statement,
      solution,
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