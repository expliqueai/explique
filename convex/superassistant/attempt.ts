import { ConvexError, v } from "convex/values";
import {
  queryWithAuth,
  mutationWithAuth,
  actionWithAuth,
} from "../auth/withAuth";
import { google } from "@ai-sdk/google";
import { generateText, streamText } from "ai";
import { getCourseRegistration } from "../courses";
import { internalAction, internalMutation, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";
import { api } from "../_generated/api";
import { Id } from "../_generated/dataModel";

const IMAGE_MODEL_PROVIDER = google("gemini-2.5-pro")


export const getName = queryWithAuth({
  args: {
    attemptId: v.id("saAttempts"),
  },
  handler: async ({ db }, { attemptId }) => {
    const attempt = await db.get(attemptId);
    return attempt?.name;
  },
});

export const getStatement = queryWithAuth({
  args: {
    attemptId: v.id("saAttempts"),
  },
  handler: async ({ db }, { attemptId }) => {
    const attempt = await db.get(attemptId);
    if (!attempt) throw new ConvexError("Invalid attempt");

    const problem = await db.get(attempt.problemId);
    if (!problem) throw new ConvexError("Attempt without problem");

    return problem.instructions;
  }
});

export const getCreationTime = queryWithAuth({
  args: {
    attemptId: v.id("saAttempts"),
  },
  handler: async ({ db }, { attemptId }) => {
    const attempt = await db.get(attemptId);
    return attempt?._creationTime;
  },
});

export const getImage = queryWithAuth({
  args: {
    attemptId: v.id("saAttempts"),
  },
  handler: async (ctx, { attemptId }) => {
    const attempt = await ctx.db.get(attemptId);
    if (!attempt) return null;
    
    if (!attempt.images || attempt.images.length === 0) {
      return null;
    }

    return await ctx.storage.getUrl(attempt.images[0]);
  }
});


export const get = queryWithAuth({
  args: {
    attemptId: v.id("saAttempts"),
  },
  handler: async (ctx, { attemptId }) => {
    return await ctx.db.get(attemptId);
  },
});

export const getAttemptId = mutationWithAuth({
  args: {
    problemId: v.optional(v.id("problems")),
  },
  handler: async (ctx, { problemId }) => {
    if (!problemId) return null;

    if (!ctx.session) throw new ConvexError("Not logged in");
    const userId = ctx.session.user._id;

    const attempt = await ctx.db
      .query("saAttempts")
      .withIndex("by_key", (q) => q.eq("userId", userId).eq("problemId", problemId))
      .first();
    if (!attempt) throw new ConvexError("No attempt");

    return attempt._id;
  }
});

export const getCourseSlug = queryWithAuth({
  args: {
    attemptId: v.id("saAttempts"),
  },
  handler: async (ctx, { attemptId }) => {
    const attempt = await ctx.db.get(attemptId);
    if (!attempt) throw new ConvexError("Wrong attempt ID");

    const problem = await ctx.db.get(attempt.problemId);
    if (!problem) throw new ConvexError("Wrong problem ID field");

    const week = await ctx.db.get(problem.weekId);
    if (!week) throw new ConvexError("Wrong week ID field");

    const course = await ctx.db.get(week.courseId);
    if (!course) throw new ConvexError("Wrong course ID field");

    return course.slug;
  }
});

export const generateAttempt = mutationWithAuth({
  args: {
    problemId: v.id("problems"),
    storageId: v.optional(v.id("_storage")),
    name: v.string(),
  }, 
  handler: async (ctx, { problemId, storageId, name }) => {
    if (!ctx.session) throw new ConvexError("Not logged in");
    const userId = ctx.session.user._id;

    let images: Id<"_storage">[] = [];

    if (storageId) {
      const metadata = await ctx.db.system.get(storageId);

      if (!metadata || !metadata.contentType) {
        throw new ConvexError("File must have a valid content type.");
      }

      if (!["image/png", "image/jpeg"].includes(metadata.contentType)) {
        throw new ConvexError("Only PNG and JPG/JPEG images are allowed.");
      }

      images = [storageId];
    }

    
    const attemptId = await ctx.db.insert("saAttempts", {
      problemId: problemId,
      userId: userId,
      name: name,
      images,
      lastModified: 0,
      validated: false,
    });

    const attempt = await ctx.db.get(attemptId);

    await ctx.db.patch(attemptId, {
      lastModified: attempt?._creationTime,
    })


    const problem = await ctx.db.get(problemId);
    if (!problem) throw new ConvexError("Missing problem");

    if (storageId) {
      const fileUrl = await ctx.storage.getUrl(storageId);
      if (fileUrl) {
        await ctx.scheduler.runAfter(
          0,
          internal.superassistant.attempt.generateFirstMessages,
          {
            fileUrl,
            problemInstructions: problem.instructions,
            solutions: problem.solutions,
            attemptId,
          }
        );
      }
    }


    return attemptId;
  },
});

export const internalGetAttempt = internalQuery({
  args: {
    attemptId: v.id("saAttempts"),
  },
  handler: async ({ db }, { attemptId }) => {
    const attempt = await db.get(attemptId);
    if (!attempt) throw new Error("Attempt not found");
    return attempt;
  },
});


export const generateFirstMessages = internalAction({
  args: {
    fileUrl: v.string(),
    problemInstructions: v.string(),
    solutions: v.optional(v.string()),
    attemptId: v.id("saAttempts"),
  },
  handler: async (ctx, { fileUrl, problemInstructions, solutions, attemptId }) => {

    const messages: ({ role: "assistant" | "system"; content: string; } 
                    | { role: "user"; content: string | ({
                            type: "text";
                            text: string;
                        } | {
                            type: "image";
                            image: string;
                        })[]; 
                      }
                    )[] = [];

    const defaultInstructions = "\
      You are an assistant for a course. You are given the exercises and corresponding solutions.\
      \
      A student is coming to you because they have tried to solve one of the exercises. Their tentative solution will be given to you.\
      \
      The exercises are numbered. Look for the problem statement and the solution to this exercise in what was first given to you to correct the student's \
      tentative solution. Never give the solution to the student, except if what they have done is completely correct and there is no error at all.\
      \
      If they have completely done the exercise, you have to correct their tentative solution. In the case that the student wrote pseudocode, convert the pseudocode to python \
      and test it. If what they have done is not correct according to the solution given to you, you must respond with \"This is not correct.\" and then give a list of what is \
      wrong in their solution (one sentence per incorrect thing). Then, give them one small tip on how they could improve their solution. If what they did is correct, tell them \
      \"Good job! Here is what the solution looks like: \" and then give them the solution to the exercise.\
      \
      If the student has tried to do the exercise but is stuck and hasn't completely done it, first tell them \"This is a good start.\" if what they started to do is a good start \
      to solve the problem and then give them one hint on how to continue in the right direction. Otherwise, if what they started to do is wrong, tell them \"You might want to \
      rethink your solution.\", then tell them what is wrong with what they have done so far (one sentence per incorrect thing) and reformulate the problem statement for them.";
  
    const attempt = await ctx.runQuery(
      internal.superassistant.attempt.internalGetAttempt,
      { attemptId }
    );

    // Get problem safely
    const problem = await ctx.runQuery(
      internal.superassistant.problem.internalGetProblem,
      { problemId: attempt.problemId }
    );

    const custom = problem.customInstructions?.trim() ?? "";

    const finalInstructions =
      custom.length > 0
        ? `${defaultInstructions}\n\n# Additional professor instructions\n${custom}`
      : defaultInstructions;

    messages.push({
      role: ("system" as const),
      content: finalInstructions,
    });


    const message1 : { type: "text"; text: string; }[] = [];
    message1.push({
      type:"text",
      text:`Here are the instructions of the exercise: ${problemInstructions}`,
    });
    message1.push({
      type:"text",
      text:`Here is the solution to the exercises: ${solutions}`,
    });
    message1.push({
      type:"text",
      text:"If I ask for the solution but my tentative solution is not perfect, tell me \"I cannot give you the solution.\" and don't give me the solution.",
    });

    await ctx.runMutation(
      internal.superassistant.messages.insertMessage,
      {
        attemptId:attemptId,
        role:"user",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        content:message1,
      }
    );
    messages.push({
      role:"user",
      content:message1,
    });

    const message2 : ({ text: string; type: "text"; } | { type: "image"; image: string; })[] = [];
    message2.push({
      type:"text",
      text:"Here is my tentative solution. Give me feedback.",
    });
    message2.push({
      type:"image",
      image:fileUrl,
    });

    await ctx.runMutation(
      internal.superassistant.messages.insertMessage,
      {
        attemptId:attemptId,
        role:"user",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        content:message2,
      }
    );
    messages.push({
      role:"user",
      content:message2,
    });

    const { textStream } = streamText({
      model: IMAGE_MODEL_PROVIDER,
      messages: messages,
      temperature: 0.7,
      abortSignal: AbortSignal.timeout(3 * 60 * 1000), // 3 minutes
    })

    const messageId = await ctx.runMutation(
      internal.superassistant.messages.insertMessage,
      {
        attemptId:attemptId,
        role:"assistant",
        content:"",
        streaming:true,
        appearance:"typing",
      }
    );

    for await (const chunk of textStream) {
      if (chunk !== "") {
        await ctx.runMutation(
          internal.superassistant.messages.addChunk,
          {
            messageId:messageId,
            chunk:chunk,
          }
        );
      }
    };

    await ctx.runMutation(
      internal.superassistant.messages.streamingDone,
      {
        messageId:messageId,
      }
    );
  },
});


export const generateUpdateMessages = internalAction({
  args: {
    fileUrl: v.string(),
    attemptId: v.id("saAttempts"),
  },
  handler: async (ctx, { fileUrl, attemptId }) => {
    const message : ({ type:"text"; text:string; } | { type:"image"; image:string; })[] = [];
    message.push({
      type:"text",
      text:"Here is a new try I made on the exercise. Analyze what is different from the previous attempt I made and tell me if I am closer to something correct or not. Give me feedback on what is different. Make sure the attempt is on the same exercise as before and that it is not a picture I already gave you.",
    });
    message.push({
      type:"image",
      image:fileUrl,
    });

    const userMessageId = await ctx.runMutation(
      internal.superassistant.messages.insertMessage,
      {
        attemptId:attemptId,
        role:"user",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        content:message,
      }
    );

    const assistantMessageId = await ctx.runMutation(
      internal.superassistant.messages.insertMessage,
      {
        attemptId:attemptId,
        role:"assistant",
        content:"",
        appearance:"typing",
      }
    );

    await ctx.scheduler.runAfter(0, internal.superassistant.messages.answerChatCompletionsApi, {
      attemptId,
      userMessageId,
      assistantMessageId,
    });
  },
});

export const updateAttemptInChat = mutationWithAuth({
  args: {
    storageId: v.id("_storage"),
    attemptId: v.id("saAttempts"),
  }, 
  handler: async (ctx, { storageId, attemptId }) => {
    if (!ctx.session) throw new ConvexError("Not logged in");

    const metadata = await ctx.db.system.get(storageId);

    if (!metadata || !metadata.contentType) {
      throw new ConvexError("File must have a valid content type.");
    }

    if (!["image/png", "image/jpeg"].includes(metadata.contentType)) {
      throw new ConvexError("Only PNG and JPG/JPEG images are allowed.");
  }

    const attempt = await ctx.db.get(attemptId);
    if (!attempt) throw new ConvexError("Attempt not found");

    const fileUrl = await ctx.storage.getUrl(storageId);
    if (!fileUrl) throw new ConvexError("No file URL");

    const isFirstImage = !attempt.images || attempt.images.length === 0;

    if (isFirstImage) {
      const problem = await ctx.db.get(attempt.problemId);
      if (!problem) throw new ConvexError("Problem missing");

      await ctx.scheduler.runAfter(
        0,
        internal.superassistant.attempt.generateFirstMessages,
        {
          fileUrl,
          problemInstructions: problem.instructions,
          solutions: problem.solutions,
          attemptId,
        }
      );
    } else {
      await ctx.scheduler.runAfter(
        0,
        internal.superassistant.attempt.generateUpdateMessages,
        {
          fileUrl,
          attemptId,
        }
      );
    }


    if (attempt) {
      const timestamp = Date.now();
      await ctx.db.patch(attemptId, {
        lastModified: timestamp,
        images: [storageId].concat(attempt.images)
      });
    };
  },
});

export const generateUploadUrl = mutationWithAuth({
  args: {},
  handler: async (ctx, {}) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const resetAttempt = mutationWithAuth({
  args: {
    attemptId: v.id("saAttempts"),
  },
  handler: async (ctx, { attemptId }) => {
    if (!ctx.session) throw new ConvexError("Not logged in");

    const attempt = await ctx.db.get(attemptId);
    if (!attempt) throw new ConvexError("Attempt not found");

    if (attempt.userId !== ctx.session.user._id) {
      throw new ConvexError("Not authorized");
    }

    const messages = await ctx.db
      .query("saMessages")
      .withIndex("by_attempt", (q) => q.eq("attemptId", attemptId))
      .collect();
    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }

    await ctx.db.delete(attemptId);
  },
});
