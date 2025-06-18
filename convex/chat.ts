import {
  internalAction,
  internalMutation,
  DatabaseReader,
  MutationCtx,
  internalQuery,
} from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { openai as openaiProvider } from "@ai-sdk/openai";
import { generateText } from "ai";
import OpenAI from "openai";
import { internal } from "./_generated/api";
import { Session, mutationWithAuth, queryWithAuth } from "./auth/withAuth";
import { Id } from "./_generated/dataModel";
import { z } from "zod";

export const COMPLETION_VALID_MODELS = [
  "gpt-4-1106-preview",
  "gpt-4-vision-preview",
  "gpt-4",
  "gpt-4o",
  "gpt-4-0314",
  "gpt-4-0613",
  "gpt-4-32k",
  "gpt-4-32k-0314",
  "gpt-4-32k-0613",
  "gpt-3.5-turbo",
  "gpt-3.5-turbo-16k",
  "gpt-3.5-turbo-0301",
  "gpt-3.5-turbo-0613",
  "gpt-3.5-turbo-1106",
  "gpt-3.5-turbo-16k-0613",
] as const;

async function getAttemptIfAuthorized(
  db: DatabaseReader,
  session: Session | null,
  attemptId: Id<"attempts">,
) {
  if (!session) {
    throw new ConvexError("Logged out");
  }

  const attempt = await db.get(attemptId);
  if (attempt === null) throw new ConvexError("Unknown attempt");

  const exercise = await db.get(attempt.exerciseId);
  if (exercise === null) throw new Error("No exercise");

  const weekId = exercise.weekId;
  if (weekId === null) {
    throw new ConvexError("This exercise has been deleted");
  }
  const week = await db.get(weekId);
  if (week === null) throw new Error("No week");

  const registration = await db
    .query("registrations")
    .withIndex("by_user_and_course", (q) =>
      q.eq("userId", session.user._id).eq("courseId", week.courseId),
    )
    .first();
  if (!registration) throw new Error("User not enrolled in the course.");

  if (attempt.userId !== session.user._id && registration.role !== "admin") {
    throw new ConvexError("Forbidden");
  }

  return attempt;
}

// Returns the messages for attempt
export const getMessages = queryWithAuth({
  args: {
    attemptId: v.id("attempts"),
  },
  handler: async ({ db, session }, { attemptId }) => {
    await getAttemptIfAuthorized(db, session, attemptId);

    const rows = await db
      .query("messages")
      .withIndex("by_attempt", (x) => x.eq("attemptId", attemptId))
      .collect();

    const reportedMessages = await db
      .query("reports")
      .withIndex("by_attempt", (x) => x.eq("attemptId", attemptId))
      .collect();

    const result = [];
    for (const message of rows) {
      const isReported = reportedMessages.some(
        (x) => x.messageId === message._id,
      );

      result.push({
        id: message._id,
        system: message.system,
        content: message.content,
        appearance: message.appearance,
        isReported: isReported,
      });
    }

    return result;
  },
});

export const insertMessage = internalMutation({
  args: {
    attemptId: v.id("attempts"),
    system: v.boolean(),
    content: v.string(),
    appearance: v.optional(v.literal("finished")),
  },
  handler: async ({ db }, { attemptId, system, content }) => {
    return await db.insert("messages", { attemptId, system, content });
  },
});

export const writeSystemResponse = internalMutation({
  args: {
    attemptId: v.id("attempts"),
    userMessageId: v.id("messages"),
    systemMessageId: v.id("messages"),
    content: v.string(),
    appearance: v.optional(v.union(v.literal("finished"), v.literal("error"))),
  },
  handler: async (
    { db },
    { attemptId, userMessageId, systemMessageId, content, appearance },
  ) => {
    const attempt = await db.get(attemptId);
    if (!attempt) {
      throw new Error("Can’t find the attempt");
    }

    await db.patch(systemMessageId, { content, appearance });

    await db.insert("logs", {
      type: "answerGenerated",
      userId: attempt.userId,
      attemptId,
      exerciseId: attempt.exerciseId,
      userMessageId,
      systemMessageId,
      variant: "explain",
    });
  },
});

async function sendMessageController(
  ctx: Omit<MutationCtx, "auth">,
  {
    message,
    attemptId,
  }: {
    attemptId: Id<"attempts">;
    message: string;
  },
) {
  const attempt = await ctx.db.get(attemptId);
  if (!attempt) throw new Error(`Attempt ${attemptId} not found`);

  const exercise = await ctx.db.get(attempt.exerciseId);
  if (!exercise) throw new Error(`Exercise ${attempt.exerciseId} not found`);

  const userMessageId = await ctx.db.insert("messages", {
    attemptId,
    system: false,
    content: message,
  });

  const systemMessageId = await ctx.db.insert("messages", {
    attemptId,
    system: true,
    appearance: "typing",
    content: "",
  });

  await ctx.db.insert("logs", {
    type: "messageSent",
    userId: attempt.userId,
    attemptId,
    exerciseId: attempt.exerciseId,
    userMessageId,
    systemMessageId,
    variant: "explain",
  });

  // Always use Chat Completions API (Assistants API deprecated)
  ctx.scheduler.runAfter(0, internal.chat.answerChatCompletionsApi, {
    attemptId,
    userMessageId,
    systemMessageId,
    model: exercise.model,
    completionFunctionDescription: exercise.completionFunctionDescription,
    instructions: exercise.instructions,
  });
}

export const sendMessageInternal = internalMutation({
  args: {
    attemptId: v.id("attempts"),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    await sendMessageController(ctx, args);
  },
});

export const sendMessage = mutationWithAuth({
  args: {
    attemptId: v.id("attempts"),
    message: v.string(),
  },
  handler: async (ctx, { attemptId, message }) => {
    const attempt = await getAttemptIfAuthorized(
      ctx.db,
      ctx.session,
      attemptId,
    );
    // Only allow messages if using explanation variant (threadId was not null before migration)
    if (attempt.threadId === null)
      throw new ConvexError("Not doing the explanation exercise");

    await sendMessageController(ctx, {
      message,
      attemptId,
    });
  },
});

export const reportMessage = mutationWithAuth({
  args: {
    messageId: v.id("messages"),
    reason: v.string(),
  },
  handler: async (ctx, { messageId, reason }) => {
    const message = await ctx.db.get(messageId);
    if (message === null) throw new ConvexError("Message not found");

    const attempt = await getAttemptIfAuthorized(
      ctx.db,
      ctx.session,
      message.attemptId,
    );

    const exercise = await ctx.db.get(attempt.exerciseId);
    if (exercise === null) throw new ConvexError("Exercise not found");

    const weekId = exercise.weekId;
    if (weekId === null) {
      throw new ConvexError("This exercise has been deleted");
    }
    const week = await ctx.db.get(weekId);
    if (week === null) throw new ConvexError("Week not found");

    await ctx.db.insert("reports", {
      attemptId: message.attemptId,
      messageId: messageId,
      courseId: week.courseId,
      reason: reason,
    });
  },
});

export const unreportMessage = mutationWithAuth({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, { messageId }) => {
    const message = await ctx.db.get(messageId);
    if (message === null) throw new ConvexError("Message not found");

    await getAttemptIfAuthorized(ctx.db, ctx.session, message.attemptId);

    const report = await ctx.db
      .query("reports")
      .withIndex("by_message", (x) => x.eq("messageId", messageId))
      .first();
    if (report === null) throw new ConvexError("No report");

    await ctx.db.delete(report._id);
  },
});

export const answerChatCompletionsApi = internalAction({
  args: {
    attemptId: v.id("attempts"),
    userMessageId: v.id("messages"),
    systemMessageId: v.id("messages"),
    model: v.string(),
    instructions: v.string(),
    completionFunctionDescription: v.string(),
  },
  handler: async (
    ctx,
    {
      attemptId,
      userMessageId,
      systemMessageId,
      model,
      completionFunctionDescription,
      instructions,
    },
  ) => {
    const openai = new OpenAI();

    if (!COMPLETION_VALID_MODELS.includes(model as any)) {
      await ctx.runMutation(internal.chat.writeSystemResponse, {
        attemptId,
        userMessageId,
        systemMessageId,
        appearance: "error",
        content: "",
      });
      throw new Error(`Invalid model ${model}`);
    }

    const messages = await ctx.runQuery(
      internal.chat.generateTranscriptMessages,
      {
        attemptId,
      },
    );

    let response;
    try {
      response = await generateText({
        model: openaiProvider(model),
        messages: [{ role: "system", content: instructions }, ...messages],
        tools: {
          markComplete: {
            description: completionFunctionDescription,
            parameters: z.object({}),
          },
        },
        temperature: 0.7,
        abortSignal: AbortSignal.timeout(3 * 60 * 1000), // 3 minutes
      });
    } catch (err) {
      console.error("Can’t create a completion", err);
      await ctx.runMutation(internal.chat.writeSystemResponse, {
        attemptId,
        userMessageId,
        systemMessageId,
        appearance: "error",
        content: "",
      });
      return;
    }

    if (response.toolCalls && response.toolCalls.length > 0) {
      // Mark as finished
      await ctx.runMutation(internal.chat.markFinished, {
        attemptId,
        systemMessageId,
      });
    } else if (!response.text) {
      console.error("No content in the response", response);
      await ctx.runMutation(internal.chat.writeSystemResponse, {
        attemptId,
        userMessageId,
        systemMessageId,
        appearance: "error",
        content: "",
      });
    } else {
      await ctx.runMutation(internal.chat.writeSystemResponse, {
        attemptId,
        userMessageId,
        systemMessageId,
        appearance: undefined,
        content: response.text,
      });
    }
  },
});

export const markFinished = internalMutation({
  args: {
    attemptId: v.id("attempts"),
    systemMessageId: v.id("messages"),
  },
  handler: async (ctx, { attemptId, systemMessageId }) => {
    const attempt = await ctx.db.get(attemptId);
    if (!attempt) {
      throw new Error("Can’t find the attempt");
    }
    // Start feedback
    const exercise = await ctx.db.get(attempt.exerciseId);
    if (!exercise) {
      throw new Error(
        "Can’t find the exercise for the attempt that was just completed",
      );
    }

    if (attempt.status === "exercise") {
      if (exercise.quiz === null) {
        // Mark the exercise as finished
        const { weekId } = exercise;
        if (weekId === null) {
          throw new Error("Deleted exercise");
        }
        const week = await ctx.db.get(weekId);
        if (!week) {
          throw new Error("Can’t find the week");
        }

        const registration = await ctx.db
          .query("registrations")
          .withIndex("by_user_and_course", (q) =>
            q.eq("userId", attempt.userId).eq("courseId", week.courseId),
          )
          .first();
        if (!registration) {
          throw new Error("The user is no longer registered in the course");
        }

        if (!registration.completedExercises.includes(attempt.exerciseId)) {
          await ctx.db.patch(registration._id, {
            completedExercises: [
              ...registration.completedExercises,
              attempt.exerciseId,
            ],
          });
        }
      }

      await ctx.db.patch(attemptId, {
        status: exercise.quiz === null ? "quizCompleted" : "exerciseCompleted",
      });
    }

    await ctx.db.patch(systemMessageId, {
      content: "",
      appearance: exercise.feedback ? "feedback" : "finished",
    });

    await ctx.db.insert("logs", {
      type: "exerciseCompleted",
      userId: attempt.userId,
      attemptId,
      exerciseId: attempt.exerciseId,
      variant: "explain",
    });

    if (exercise.feedback) {
      await ctx.scheduler.runAfter(0, internal.chat.startFeedback, {
        feedbackMessageId: systemMessageId,
        attemptId,
        model: exercise.feedback.model,
        prompt: exercise.feedback.prompt,
      });
    }
  },
});

export const startFeedback = internalAction({
  args: {
    attemptId: v.id("attempts"),
    feedbackMessageId: v.id("messages"),
    model: v.string(),
    prompt: v.string(),
  },
  handler: async (ctx, { attemptId, feedbackMessageId, model, prompt }) => {
    try {
      if (!COMPLETION_VALID_MODELS.includes(model as any)) {
        throw new Error(`Invalid model ${model}`);
      }

      const transcript = await ctx.runQuery(internal.chat.generateTranscript, {
        attemptId,
      });

      const response = await generateText({
        model: openaiProvider(model),
        messages: [
          {
            role: "system",
            content: prompt,
          },
          {
            role: "user",
            content: transcript,
          },
        ],
        temperature: 0.7,
        abortSignal: AbortSignal.timeout(3 * 60 * 1000), // 3 minutes
      });

      await ctx.runMutation(internal.chat.saveFeedback, {
        attemptId,
        feedbackMessageId,
        feedback: response.text,
      });
    } catch (err) {
      console.error("Feedback error", err);
      await ctx.runMutation(internal.chat.saveFeedback, {
        attemptId,
        feedbackMessageId,
        feedback: "error",
      });
    }
  },
});

export const generateTranscript = internalQuery({
  args: {
    attemptId: v.id("attempts"),
  },
  handler: async ({ db }, { attemptId }) => {
    const messages = await db
      .query("messages")
      .withIndex("by_attempt", (q) => q.eq("attemptId", attemptId))
      .collect();

    return messages
      .filter((q) => !q.appearance)
      .map(
        ({ content, system }) =>
          `<message from="${system ? "chatbot" : "student"}">${content}</message>`,
      )
      .join("\n\n");
  },
});

export const generateTranscriptMessages = internalQuery({
  args: {
    attemptId: v.id("attempts"),
  },
  handler: async ({ db }, { attemptId }) => {
    const messages = await db
      .query("messages")
      .withIndex("by_attempt", (q) => q.eq("attemptId", attemptId))
      .collect();

    return messages
      .filter((q) => !q.appearance && q.content)
      .map(({ content, system }) => ({
        role: system ? ("assistant" as const) : ("user" as const),
        content: content,
      }));
  },
});

export const saveFeedback = internalMutation({
  args: {
    attemptId: v.id("attempts"),
    feedbackMessageId: v.id("messages"),
    feedback: v.string(),
  },
  handler: async (ctx, args) => {
    const attempt = await ctx.db.get(args.attemptId);
    if (!attempt) {
      throw new Error("Can’t find the attempt");
    }

    await ctx.db.patch(args.feedbackMessageId, {
      content: args.feedback,
    });

    await ctx.db.insert("logs", {
      type: "feedbackGiven",
      userId: attempt.userId,
      attemptId: args.attemptId,
      exerciseId: attempt.exerciseId,
      systemMessageId: args.feedbackMessageId,
      variant: "explain",
    });
  },
});
