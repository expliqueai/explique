import {
  internalMutation,
  DatabaseReader,
  MutationCtx,
  internalAction,
  internalQuery,
} from "../_generated/server";
import { ConvexError, v } from "convex/values";
import { Session, queryWithAuth, mutationWithAuth } from "../auth/withAuth";
import { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import OpenAI from "openai";

async function getAttemptIfAuthorized(
  db: DatabaseReader,
  session: Session | null,
  attemptId: Id<"saAttempts">,
) {
  if (!session) {
    throw new ConvexError("Logged out");
  }

  const attempt = await db.get(attemptId);
  if (attempt === null) throw new ConvexError("Unknown attempt");

  const registration = await db
    .query("registrations")
    .withIndex("by_user_and_course", (q) =>
      q.eq("userId", session.user._id),
    )
    .first();
  if (!registration) throw new Error("User not enrolled in the course.");

  if (attempt.userId !== session.user._id && registration.role !== "admin") {
    throw new ConvexError("Forbidden");
  }

  return attempt;
}

export const list = queryWithAuth({
  args: {
    attemptId: v.id("saAttempts"),
  },
  handler: async (ctx, { attemptId }) => {
    await getAttemptIfAuthorized(ctx.db, ctx.session, attemptId);

    const rows = await ctx.db
      .query("saMessages")
      .withIndex("by_attempt", (x) => x.eq("attemptId", attemptId))
      .collect();
    rows.shift();
    rows.shift();

    const reportedMessages = await ctx.db
      .query("saReports")
      .withIndex("by_attempt", (x) => x.eq("attemptId", attemptId))
      .collect();

    const result = [];
    for (const message of rows) {
      const isReported = reportedMessages.some(
        (x) => x.messageId === message._id,
      );

      result.push({
        id: message._id,
        role: message.role,
        content: message.content,
        appearance: message.appearance,
        isReported: isReported,
      });
    }

    return result;
  },
});

export const reportMessage = mutationWithAuth({
  args: {
    messageId: v.id("saMessages"),
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
    if (attempt === null) throw new ConvexError("Feedback not found");

    const problem = await ctx.db.get(attempt.problemId);
    if (!problem) throw new ConvexError("Invalid problemId field");
    const week = await ctx.db.get(problem.weekId);
    if (!week) throw new ConvexError("Invalid weekId field");

    await ctx.db.insert("saReports", {
      attemptId: message.attemptId,
      messageId: messageId,
      courseId: week.courseId,
      reason: reason,
    });
  },
});

export const unreportMessage = mutationWithAuth({
  args: {
    messageId: v.id("saMessages"),
  },
  handler: async (ctx, { messageId }) => {
    const message = await ctx.db.get(messageId);
    if (message === null) throw new ConvexError("Message not found");

    await getAttemptIfAuthorized(ctx.db, ctx.session, message.attemptId);

    const report = await ctx.db
      .query("saReports")
      .withIndex("by_message", (x) => x.eq("messageId", messageId))
      .first();
    if (report === null) throw new ConvexError("No report");

    await ctx.db.delete(report._id);
  },
});

export const insertMessage = internalMutation({
  args: {
    attemptId: v.id("saAttempts"),
    role: v.union(
      v.literal("user"),
      v.literal("system"),
      v.literal("assistant"),
    ),
    content: v.union(
      v.string(),
      v.array(
        v.union(
          v.object({
            type: v.literal("text"),
            text: v.string(),
          }),
          v.object({
            type: v.literal("image_url"),
            image_url: v.object({ url: v.string() }),
          }),
        ),
      ),
    ),
    appearance: v.optional(
      v.union(
        v.literal("finished"),
        v.literal("feedback"),
        v.literal("typing"),
        v.literal("error"),
      ),
    ),
    streaming: v.optional(v.boolean()),
  },
  handler: async (
    { db },
    { attemptId, role, content, appearance, streaming },
  ) => {
    return await db.insert("saMessages", {
      attemptId,
      content,
      role,
      appearance,
      streaming,
    });
  },
});

export const addChunk = internalMutation({
  args: {
    messageId: v.id("saMessages"),
    chunk: v.string(),
  },
  handler: async ({ db }, { messageId, chunk }) => {
    const message = await db.get(messageId);
    if (typeof message?.content === "string") {
      await db.patch(messageId, {
        content: message.content.concat(chunk),
      });
    }
  },
});

export const streamingDone = internalMutation({
  args: {
    messageId: v.id("saMessages"),
  },
  handler: async ({ db }, { messageId }) => {
    await db.patch(messageId, {
      streaming: false,
    });
  },
});

export const getAttempt = queryWithAuth({
  args: {
    attemptId: v.id("saAttempts"),
  },
  handler: async (ctx, { attemptId }) => {
    const attempt = await ctx.db
      .query("saMessages")
      .withIndex("by_attempt", (x) => x.eq("attemptId", attemptId))
      .filter((x) => x.eq(x.field("role"), "assistant"))
      .order("desc")
      .first();

    if (attempt === null || typeof attempt.content !== "string")
      return undefined;
    return {
      content: attempt.content,
      streaming: attempt.streaming,
    };
  },
});

async function sendMessageController(
  ctx: Omit<MutationCtx, "auth">,
  {
    message,
    attemptId,
  }: {
    attemptId: Id<"saAttempts">;
    message: string;
  },
) {
  const attempt = await ctx.db.get(attemptId);
  if (!attempt) throw new Error(`Attempt ${attemptId} not found`);

  const userMessageId = await ctx.db.insert("saMessages", {
    attemptId,
    role: "user",
    content: message,
  });

  const assistantMessageId = await ctx.db.insert("saMessages", {
    attemptId,
    role: "assistant",
    appearance: "typing",
    content: "",
  });

  ctx.scheduler.runAfter(
    0,
    internal.superassistant.messages.answerChatCompletionsApi,
    {
      attemptId,
      userMessageId,
      assistantMessageId,
    },
  );
}

export const generateTranscriptMessages = internalQuery({
  args: {
    attemptId: v.id("saAttempts"),
  },
  handler: async ({ db }, { attemptId }) => {
    const feedbackMessages = await db
      .query("saMessages")
      .withIndex("by_attempt", (q) => q.eq("attemptId", attemptId))
      .collect();

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

    const instructions =
      '\
            You are an assistant for a course. You are given the exercises and corresponding solutions.\
            \
            A student is coming to you because they have tried to solve one of the exercises. Their tentative solution will be given to you.\
            \
            The exercises are numbered. Look for the problem statement and the solution to this exercise in what was first given to you to correct the student\'s \
            tentative solution. Never give the solution to the student, except if what they have done is completely correct and there is no error at all.\
            \
            If they have completely done the exercise, you have to correct their tentative solution. In the case that the student wrote pseudocode, convert the pseudocode to python \
            and test it. If what they have done is not correct according to the solution given to you, you must respond with "This is not correct." and then give a list of what is \
            wrong in their solution (one sentence per incorrect thing). Then, give them one small tip on how they could improve their solution. If what they did is correct, tell them \
            "Good job! Here is what the solution looks like: " and then give them the solution to the exercise.\
            \
            If the student has tried to do the exercise but is stuck and hasn\'t completely done it, first tell them "This is a good start." if what they started to do is a good start \
            to solve the problem and then give them one hint on how to continue in the right direction. Otherwise, if what they started to do is wrong, tell them "You might want to \
            rethink your solution.", then tell them what is wrong with what they have done so far (one sentence per incorrect thing) and reformulate the problem statement for them.';

    messages.push({
      role: "system",
      content: instructions,
    });

    for (const feedbackMessage of feedbackMessages) {
      if (feedbackMessage.appearance) continue;
      if (
        feedbackMessage.role === "system" &&
        typeof feedbackMessage.content === "string"
      ) {
        messages.push({
          role: "system",
          content: feedbackMessage.content,
        });
      } else if (feedbackMessage.role === "user") {
        messages.push({
          role: "user",
          content: feedbackMessage.content,
        });
      } else if (
        feedbackMessage.role === "assistant" &&
        typeof feedbackMessage.content === "string"
      ) {
        messages.push({
          role: "assistant",
          content: feedbackMessage.content,
        });
      }
    }

    return messages;
  },
});

export const writeSystemResponse = internalMutation({
  args: {
    attemptId: v.id("saAttempts"),
    userMessageId: v.id("saMessages"),
    assistantMessageId: v.id("saMessages"),
    content: v.string(),
    appearance: v.optional(v.union(v.literal("finished"), v.literal("error"))),
  },
  handler: async (
    { db },
    { attemptId, userMessageId, assistantMessageId, content, appearance },
  ) => {
    const attempt = await db.get(attemptId);
    if (!attempt) {
      throw new Error("Can’t find the attempt");
    }

    await db.patch(assistantMessageId, { content, appearance });
  },
});

export const answerChatCompletionsApi = internalAction({
  args: {
    attemptId: v.id("saAttempts"),
    userMessageId: v.id("saMessages"),
    assistantMessageId: v.id("saMessages"),
  },
  handler: async (ctx, { attemptId, userMessageId, assistantMessageId }) => {
    const openai = new OpenAI();

    const messages = await ctx.runQuery(
      internal.superassistant.messages.generateTranscriptMessages,
      {
        attemptId,
      },
    );

    let response;
    try {
      response = await openai.chat.completions.create(
        {
          model: "gpt-4o",
          messages: messages,
          temperature: 0.7,
          stream: false,
        },
        {
          timeout: 3 * 60 * 1000, // 3 minutes
        },
      );
    } catch (err) {
      console.error("Can’t create a completion", err);
      await ctx.runMutation(internal.superassistant.messages.writeSystemResponse, {
        attemptId,
        userMessageId,
        assistantMessageId,
        appearance: "error",
        content: "",
      });
      return;
    }

    const message = response.choices[0].message;
    if (!message.content) {
      console.error("No content in the response", message);
      await ctx.runMutation(internal.superassistant.messages.writeSystemResponse, {
        attemptId,
        userMessageId,
        assistantMessageId,
        appearance: "error",
        content: "",
      });
    } else {
      await ctx.runMutation(internal.superassistant.messages.writeSystemResponse, {
        attemptId,
        userMessageId,
        assistantMessageId,
        appearance: undefined,
        content: message.content,
      });
    }
  },
});

export const sendMessage = mutationWithAuth({
  args: {
    attemptId: v.id("saAttempts"),
    message: v.string(),
  },
  handler: async (ctx, { attemptId, message }) => {

    await sendMessageController(ctx, {
      message,
      attemptId,
    });

    const timestamp = Date.now();
    await ctx.db.patch(attemptId, {
      lastModified: timestamp,
    });
  },
});

export const deleteMessages = internalMutation({
  args: {
    attemptId: v.id("saAttempts"),
  },
  handler: async (ctx, { attemptId }) => {
    const messages = await ctx.db
      .query("saMessages")
      .withIndex("by_attempt", (x) => x.eq("attemptId", attemptId))
      .collect();

    const ids = messages.map(({ _id }) => _id);
    for (const id of ids) {
      ctx.db.delete(id);
    }
  },
});