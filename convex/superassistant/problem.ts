import { ConvexError, v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { queryWithAuth, mutationWithAuth } from "../auth/withAuth";
import { internalQuery } from "../_generated/server";

export type Status = "NOT STARTED" | "IN PROGRESS" | "COMPLETED";
export type Problem = { id: Id<"problems">; weekId: Id<"weeks">; name: string; instructions: string; solutions? : string; mandatory: boolean; status: Status; attemptId?: Id<"saAttempts">, customInstructions?: string, images?: Id<"_storage">[];};

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
            status:
            attempt && attempt.images?.length > 0
              ? "IN PROGRESS"
              : "NOT STARTED",
            attemptId: attempt ? attempt._id : undefined,
            customInstructions: problem.customInstructions,
            images: attempt?.images ?? [], 
        });
    }

    return result;
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
    customInstructions: v.optional(v.string()),
  },
  handler: async (ctx, { weekId, name, instructions, solutions, mandatory, customInstructions }) => {
    return await ctx.db.insert("problems", {
      weekId,
      name,
      instructions,
      solutions,
      mandatory,
      customInstructions: customInstructions ?? ""
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
    customInstructions: v.optional(v.string()),
  },
  handler: async (ctx, { problemId, name, instructions, solutions, mandatory, customInstructions}) => {
    await ctx.db.patch(problemId, {
      name,
      instructions,
      solutions,
      mandatory,
      customInstructions: customInstructions ?? "",
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

export const internalGetProblem = internalQuery({
  args: {
    problemId: v.id("problems"),
  },
  handler: async ({ db }, { problemId }) => {
    const p = await db.get(problemId);
    if (!p) throw new ConvexError("Problem not found");
    return p;
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
      customInstructions: p.customInstructions ?? "",
    };
  },
});