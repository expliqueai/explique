
import {
  internalAction,
  internalMutation,
  internalQuery,
  query,
  mutation,
} from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import OpenAI from "openai";
import { internal } from "../_generated/api";
import { queryWithAuth, mutationWithAuth } from "../auth/withAuth";


export const listProblemSets = queryWithAuth({
  args: { courseId: v.id("courses") },
  handler: async (ctx, { courseId }) => {
    return await ctx.db
      .query("problemSets")
      .withIndex("by_course", (q) => q.eq("courseId", courseId))
      .collect();
  },
});

function parseExerciseNumber(num: string | undefined): [number, string] {
  if (!num) return [Infinity, ""];

  const match = num.match(/^(\d+)([a-zA-Z]*)$/);
  if (!match) return [Infinity, num];

  const base = parseInt(match[1], 10);
  const suffix = match[2] || "";
  return [base, suffix];
}

export const listProblemsForSet = queryWithAuth({
  args: { problemSetId: v.id("problemSets") },
  handler: async (ctx, { problemSetId }) => {
    const problems = await ctx.db
      .query("problems")
      .withIndex("by_problemSet", (q) => q.eq("problemSetId", problemSetId))
      .collect();

    return problems.sort((a, b) => {
      const [aNum, aSuffix] = parseExerciseNumber(a.number);
      const [bNum, bSuffix] = parseExerciseNumber(b.number);

      if (aNum !== bNum) return aNum - bNum;

      if (aSuffix === "" && bSuffix !== "") return -1;
      if (aSuffix !== "" && bSuffix === "") return 1;

      return aSuffix.localeCompare(bSuffix);
    });
  },
});

export const listProblemSetsByWeek = queryWithAuth({
  args: { weekId: v.id("weeks") },
  handler: async (ctx, { weekId }) => {
    const week = await ctx.db.get(weekId);
    if (!week) return [];

    const inCourse = await ctx.db
      .query("problemSets")
      .withIndex("by_course", q => q.eq("courseId", week.courseId))
      .collect();

    return inCourse.filter(ps => ps.weekId === weekId && ps.status === "READY");
  },
});


export const createProblemSet = mutationWithAuth({
  args: {
    courseId: v.id("courses"),
    weekId: v.id("weeks"),
    storageId: v.id("_storage"), 
    storageIds: v.optional(v.array(v.id("_storage"))), 
    name: v.string(),
  },
  handler: async (ctx, { courseId, weekId, storageId, storageIds, name }) => {
    const id = await ctx.db.insert("problemSets", {
      courseId,
      weekId,
      storageId,   
      storageIds, 
      name,
      status: "UPLOADED",
      createdAt: Date.now(),
    });

    await ctx.scheduler.runAfter(
      0,
      internal.superassistant.problemExtraction.startExtraction,
      { problemSetId: id }
    );

    return id;
  },
});


export const validateProblem = mutationWithAuth({
  args: {
    problemId: v.id("problems"),
    validatedContent: v.string(),
  },
  handler: async (ctx, { problemId, validatedContent }) => {
    await ctx.db.patch(problemId, {
      validatedContent,
      validated: true,
    });
  },
});



export const getProblemSet2 = internalQuery({
  args: { problemSetId: v.id("problemSets") },
  handler: async (ctx, { problemSetId }) => {
    return await ctx.db.get(problemSetId);
  },
});

export const setProblemSetStatus2 = internalMutation({
  args: {
    problemSetId: v.id("problemSets"),
    status: v.union(
      v.literal("PROCESSING"),
      v.literal("READY"),
      v.literal("UPLOADED"),
      v.literal("VALIDATED")
    ),
  },
  handler: async (ctx, { problemSetId, status }) => {
    await ctx.db.patch(problemSetId, { status });
  },
});

export const insertProblem2 = internalMutation({
  args: {
    problemSetId: v.id("problemSets"),
    pageNumber: v.number(),
    rawExtraction: v.string(),
    number: v.optional(v.string()),
    //order: v.number(),
  },
  handler: async (ctx, { problemSetId, pageNumber, rawExtraction, number}) => {
    await ctx.db.insert("problems", {
      problemSetId,
      pageNumber,
      rawExtraction,
      number,
      validatedContent: undefined,
      validated: false,
      //order,
      starred: false,
    });
  },
});


export const startExtraction = internalAction({
  args: { problemSetId: v.id("problemSets") },
  handler: async (ctx, { problemSetId }) => {
    const ps = await ctx.runQuery(
      internal.superassistant.problemExtraction.getProblemSet2,
      { problemSetId }
    );
    if (!ps) throw new Error("ProblemSet not found");

    await ctx.runMutation(
      internal.superassistant.problemExtraction.setProblemSetStatus2,
      { problemSetId, status: "PROCESSING" }
    );

    try {
      const openai = new OpenAI();

      if (ps.storageIds && ps.storageIds.length > 0) {
        for (let i = 0; i < ps.storageIds.length; i++) {
          const imgUrl = await ctx.storage.getUrl(ps.storageIds[i]);
          if (!imgUrl) continue;

          const resp = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: `You are an assistant that extracts ALL exercises from the given assignment page. You should always extract the full the porblem even if part is in bullet points.
                    Return strict JSON with either:
                    - an array of problems: [ { "number": string, "statement": string, ... } ]
                    - OR { "problems": [ ... ] }`,
              },
              {
                role: "user",
                content: [
                  { type: "text", text: "Extract all problems from this page:" },
                  { type: "image_url", image_url: { url: imgUrl } },
                ],
              },
            ],
            response_format: { type: "json_object" },
          });

          const content = resp.choices[0]?.message?.content ?? "{}";
          let problems: any[] = [];

          try {
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed)) {
              problems = parsed;
            } else if (Array.isArray(parsed.problems)) {
              problems = parsed.problems;
            } else {
              console.warn("Unexpected extraction format:", parsed);
            }
          } catch (err) {
            console.error("Failed to parse extraction JSON:", err, content);
          }

           for (const [idx, problem] of problems.entries()) {
            await ctx.runMutation(
              internal.superassistant.problemExtraction.insertProblem2,
              {
                problemSetId,
                pageNumber: i + 1,
                rawExtraction: JSON.stringify(problem),
                number: problem.number,
                //order: idx,
              }
            );
          }
        }
      } else {
        console.warn("No page images found, only PDF saved:", ps.storageId);
      }

      await ctx.runMutation(
        internal.superassistant.problemExtraction.setProblemSetStatus2,
        { problemSetId, status: "READY" }
      );
    } catch (err) {
      console.error("Extraction failed:", err);
      await ctx.runMutation(
        internal.superassistant.problemExtraction.setProblemSetStatus2,
        { problemSetId, status: "UPLOADED" }
      );
    }
  },
});

export const getProblemSet = queryWithAuth({
  args: { problemSetId: v.id("problemSets") },
  handler: async (ctx, { problemSetId }) => {
    return await ctx.db.get(problemSetId);
  },
});

export const getProblemSet1 = internalQuery({
  args: { problemSetId: v.id("problemSets") },
  handler: async ({ db }, { problemSetId }) => {
    return await db.get(problemSetId);
  },
});

export const getSaDatabase = internalQuery({
  args: { courseId: v.id("courses") },
  handler: async ({ db }, { courseId }) => {
    return await db
      .query("saDatabase")
      .withIndex("by_course", (q) => q.eq("courseId", courseId))
      .first();
  },
});

export const setStatus = internalMutation({
  args: {
    problemSetId: v.id("problemSets"),
    status: v.union(
      v.literal("UPLOADED"),
      v.literal("PROCESSING"),
      v.literal("READY"),
      v.literal("VALIDATED")
    ),
  },
  handler: async ({ db }, { problemSetId, status }) => {
    await db.patch(problemSetId, { status });
  },
});

export const saveDraftProblem = internalMutation({
  args: {
    problemSetId: v.id("problemSets"),
    pageNumber: v.number(),
    rawExtraction: v.string(),
    //order: v.number(),
  },
  handler: async ({ db }, { problemSetId, pageNumber, rawExtraction }) => {
    await db.insert("problems", {
      problemSetId,
      pageNumber,
      rawExtraction,
      validated: false,
      //order,
    });
  },
});


export const deleteProblem = mutationWithAuth({
  args: { problemId: v.id("problems") },
  handler: async (ctx, { problemId }) => {
    await ctx.db.delete(problemId);
  },
});

export const toggleStarProblem = mutationWithAuth({
  args: { problemId: v.id("problems") },
  handler: async (ctx, { problemId }) => {
    const prob = await ctx.db.get(problemId);
    await ctx.db.patch(problemId, { starred: !prob?.starred });
  },
});


// export const reorderProblems = mutationWithAuth({
//   args: {
//     problemSetId: v.id("problemSets"),
//     from: v.number(),
//     to: v.number(),
//   },
//   handler: async (ctx, { problemSetId, from, to }) => {
//     const problems = await ctx.db
//       .query("problems")
//       .withIndex("by_problemSet", (q) => q.eq("problemSetId", problemSetId))
//       .collect();

//     const sorted = problems.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

//     const [moved] = sorted.splice(from, 1);
//     sorted.splice(to, 0, moved);

//     await Promise.all(
//       sorted.map((p, idx) =>
//         ctx.db.patch(p._id, { order: idx })
//       )
//     );
//   },
// });

export const getWeek = queryWithAuth({
  args: { weekId: v.id("weeks") },
  handler: async (ctx, { weekId }) => {
    return await ctx.db.get(weekId);
  },
});

export const deleteProblemSet = mutationWithAuth({
  args: { problemSetId: v.id("problemSets") },
  handler: async (ctx, { problemSetId }) => {
    const problems = await ctx.db
      .query("problems")
      .withIndex("by_problemSet", (q) => q.eq("problemSetId", problemSetId))
      .collect();

    for (const prob of problems) {
      await ctx.db.delete(prob._id);
    }

    await ctx.db.delete(problemSetId);
  },
});