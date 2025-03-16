import { ConvexError, v } from "convex/values";
import {
  actionWithAuth,
  mutationWithAuth,
  queryWithAuth,
} from "../auth/withAuth";
import OpenAI from "openai";
import {
  ActionCtx,
  internalAction,
  internalMutation,
} from "../_generated/server";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import { TextContentBlock } from "openai/resources/beta/threads/messages";

export const get = queryWithAuth({
  args: {
    lectureId: v.id("lectures"),
  },
  handler: async ({ db, session }, { lectureId }) => {
    if (!session) {
      throw new ConvexError("Unauthenticated");
    }

    const chat = await db
      .query("lectureChats")
      .withIndex("by_lecture_and_user", (q) =>
        q.eq("lectureId", lectureId).eq("userId", session.user._id),
      )
      .first();

    if (!chat) {
      return {
        hasThread: false,
        messages: [],
      };
    }

    const messages = await db
      .query("lectureChatMessages")
      .withIndex("by_lecture_chat_id", (q) => q.eq("lectureChatId", chat._id))
      .collect();

    return {
      hasThread: true,
      messages: messages.map((message) => ({
        id: message._id,
        content: message.content,
        system: message.system,
        appearance: message.appearance,
      })),
    };
  },
});

export const initializeChat = actionWithAuth({
  args: {
    lectureId: v.id("lectures"),
  },
  handler: async (ctx, args) => {
    if (!ctx.session) {
      throw new ConvexError("Unauthenticated");
    }

    const openai = new OpenAI();
    const thread = await openai.beta.threads.create();

    await ctx.runMutation(internal.video.chat._createChat, {
      lectureId: args.lectureId,
      userId: ctx.session.user._id,
      threadId: thread.id,
    });
  },
});

export const _createChat = internalMutation({
  args: {
    lectureId: v.id("lectures"),
    userId: v.id("users"),
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("lectureChats")
      .withIndex("by_lecture_and_user", (q) =>
        q.eq("lectureId", args.lectureId).eq("userId", args.userId),
      )
      .first();
    if (existing) {
      throw new ConvexError("Chat already initialized");
    }

    await ctx.db.insert("lectureChats", {
      lectureId: args.lectureId,
      userId: args.userId,
      threadId: args.threadId,
    });
  },
});

export const sendMessage = mutationWithAuth({
  args: {
    lectureId: v.id("lectures"),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    if (!ctx.session) {
      throw new ConvexError("Unauthenticated");
    }
    const { user } = ctx.session;

    const lecture = await ctx.db.get(args.lectureId);
    if (!lecture) {
      throw new ConvexError("Lecture not found");
    }

    if (!lecture.assistantId) {
      throw new ConvexError("This lecture hasn’t been initialized yet");
    }

    const chat = await ctx.db
      .query("lectureChats")
      .withIndex("by_lecture_and_user", (q) =>
        q.eq("lectureId", args.lectureId).eq("userId", user._id),
      )
      .first();
    if (!chat) {
      throw new ConvexError("Chat not initialized");
    }

    await ctx.db.insert("lectureChatMessages", {
      lectureChatId: chat._id,
      content: args.message,
      system: false,
    });

    const systemMessageId = await ctx.db.insert("lectureChatMessages", {
      lectureChatId: chat._id,
      content: "",
      system: true,
      appearance: "typing",
    });

    await ctx.scheduler.runAfter(0, internal.video.chat.answer, {
      message: args.message,
      threadId: chat.threadId,
      assistantId: lecture.assistantId,
      lectureChatId: chat._id,
      systemMessageId,
    });
  },
});

export const answer = internalAction({
  args: {
    message: v.string(),
    threadId: v.string(),
    assistantId: v.string(),
    lectureChatId: v.id("lectureChats"),
    systemMessageId: v.id("lectureChatMessages"),
  },
  handler: async (ctx, args) => {
    const openai = new OpenAI();

    let lastMessageId;
    let runId;

    try {
      const { id } = await openai.beta.threads.messages.create(args.threadId, {
        role: "user",
        content: args.message,
      });
      lastMessageId = id;
    } catch (err) {
      console.error("Can’t create a message", err);
      await sendError(ctx, args.systemMessageId);
      return;
    }

    try {
      const { id } = await openai.beta.threads.runs.create(args.threadId, {
        assistant_id: args.assistantId,
      });
      runId = id;
    } catch (err) {
      console.error("Can’t create a run", err);
      await sendError(ctx, args.systemMessageId);
      return;
    }

    await ctx.scheduler.runAfter(2000, internal.video.chat.checkAnswer, {
      runId,
      threadId: args.threadId,
      lectureChatId: args.lectureChatId,
      lastMessageId,
      systemMessageId: args.systemMessageId,
    });
  },
});

export const checkAnswer = internalAction({
  args: {
    runId: v.string(),
    threadId: v.string(),
    lectureChatId: v.id("lectureChats"),
    lastMessageId: v.string(),
    systemMessageId: v.id("lectureChatMessages"),
  },
  handler: async (ctx, args) => {
    const openai = new OpenAI();
    const maxAttempts = 30; // Maximum number of polling attempts
    const pollingInterval = 2000; // Time between polls in milliseconds
    let attempts = 0;

    while (attempts < maxAttempts) {
      let run;
      try {
        run = await openai.beta.threads.runs.retrieve(
          args.threadId,
          args.runId,
        );
      } catch (err) {
        console.error("Run retrieve error", err);
        await sendError(ctx, args.systemMessageId);
        return;
      }

      // Check run status and handle accordingly
      switch (run.status) {
        case "completed":
          // Run is complete, proceed to fetch messages
          const { data: newMessages } = await openai.beta.threads.messages.list(
            args.threadId,
            { after: args.lastMessageId, order: "asc" },
          );

          const text = newMessages
            .flatMap(({ content }) => content)
            .filter((item): item is TextContentBlock => item.type === "text")
            .map(({ text }) => text.value)
            .join("\n\n");

          await ctx.runMutation(internal.video.chat.writeSystemResponse, {
            systemMessageId: args.systemMessageId,
            appearance: undefined,
            content: text,
          });
          return;

        case "failed":
        case "cancelled":
          console.error("Run ended with status:", run.status, run.last_error);
          await sendError(ctx, args.systemMessageId);
          return;

        case "queued":
        case "in_progress":
          // Still processing, wait and check again
          attempts++;
          if (attempts >= maxAttempts) {
            console.error("Run timed out after maximum polling attempts");
            await sendError(ctx, args.systemMessageId);
            return;
          }

          // Schedule next check after polling interval
          await ctx.scheduler.runAfter(
            pollingInterval / 1000,
            internal.video.chat.checkAnswer,
            args,
          );
          return;

        case "requires_action":
          console.error("Run requires action which is not implemented");
          await sendError(ctx, args.systemMessageId);
          return;

        default:
          console.error("Unknown run status:", run.status);
          await sendError(ctx, args.systemMessageId);
          return;
      }
    }
  },
});

export const writeSystemResponse = internalMutation({
  args: {
    content: v.string(),
    appearance: v.optional(v.literal("error")),
    systemMessageId: v.id("lectureChatMessages"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.systemMessageId, {
      content: args.content,
      appearance: args.appearance,
    });
  },
});

async function sendError(
  ctx: ActionCtx,
  systemMessageId: Id<"lectureChatMessages">,
) {
  await ctx.runMutation(internal.video.chat.writeSystemResponse, {
    content: "",
    appearance: "error",
    systemMessageId,
  });
}
