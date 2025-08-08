import { ConvexError, v } from "convex/values";
import {
  queryWithAuth,
  mutationWithAuth,
  actionWithAuth,
} from "./auth/withAuth";
import { getCourseRegistration } from "./courses";
import OpenAI from "openai";
import { internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { api } from "../convex/_generated/api";

export const getCreationTime = queryWithAuth({
  args: {
    chatId: v.id("chats"),
  },
  handler: async ({ db }, { chatId }) => {
    const chat = await db.get(chatId);
    return chat?._creationTime;
  },
});

export const generateChat = mutationWithAuth({
  args: {
    courseSlug: v.string(),
    reason: v.string(),
    name: v.string(),
    weekNumber: v.number(),
  },
  handler: async (ctx, { courseSlug, reason, name, weekNumber }) => {
    if (!ctx.session) throw new ConvexError("Not logged in");
    const userId = ctx.session.user._id;

    const { course } = await getCourseRegistration(
      ctx.db,
      ctx.session,
      courseSlug,
    );

    const chatId = await ctx.db.insert("chats", {
      userId: userId,
      courseId: course._id,
      name: name !== "" ? name : undefined,
      lastModified: 0,
      weekNumber: weekNumber,
    });

    const chat = await ctx.db.get(chatId);

    await ctx.db.patch(chatId, {
      lastModified: chat?._creationTime,
    });

    await ctx.scheduler.runAfter(0, internal.sachat.generateFirstMessages, {
      courseId: course._id,
      userId: userId,
      chatId: chatId,
      reason: reason,
      weekNumber: weekNumber,
    });

    return chatId;
  },
});

export const generateFirstMessages = internalAction({
  args: {
    courseId: v.id("courses"),
    userId: v.id("users"),
    chatId: v.id("chats"),
    reason: v.string(),
    weekNumber: v.number(),
  },
  handler: async (ctx, { courseId, userId, chatId, reason, weekNumber }) => {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

    const instructions =
      "\
        You are an assistant for a course. You are given the exercises and corresponding solutions.\
        \
        A student is coming to you because they have tried to solve one of the exercises but is stuck. They need help to start it.\
        \
        First make sure that the student understood the problem statement and what is asked in the exercise. Then, if they are still stuck, you can give them hints on how to start the \
        exercise. But never give them the solution to the exercise, even if they ask for it. Your answer should be short and only contain between 1 and 5 sentences. You can give them the problem statement.";

    messages.push({
      role: "system",
      content: instructions,
    });

    const urls = await ctx.runQuery(internal.admin.sadatabase.getUrls, {
      courseId: courseId,
      weekNumber: weekNumber,
    });
    const message1: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [];
    message1.push({
      type: "text",
      text: 'Here is the solution to the exercises. If I ask for the solution but my tentative solution is not perfect, tell me "I cannot give you the solution." and don\'t give me the solution.',
    });
    for (const url of urls) {
      message1.push({
        type: "image_url",
        image_url: {
          url: url,
        },
      });
    }

    await ctx.runMutation(internal.sachatmessages.insertMessage, {
      chatId: chatId,
      assistant: false,
      content: message1 as Array<
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string } }
      >,
    });
    messages.push({
      role: "user",
      content: message1,
    });

    await ctx.runMutation(internal.sachatmessages.insertMessage, {
      chatId: chatId,
      assistant: false,
      content: reason,
    });
    messages.push({
      role: "user",
      content: reason,
    });

    const assistantMessageId = await ctx.runMutation(
      internal.sachatmessages.insertMessage,
      {
        chatId: chatId,
        assistant: true,
        content: "",
        appearance: "typing",
      },
    );

    const openai = new OpenAI();

    const answer = await openai.chat.completions.create(
      {
        model: "gpt-4o",
        messages: messages,
        temperature: 0.3,
        stream: false,
      },
      {
        timeout: 3 * 60 * 1000, // 3 minutes
      },
    );
    const message2 = answer.choices[0]?.message?.content ?? "";

    await ctx.runMutation(internal.sachatmessages.writeSystemResponse, {
      chatId: chatId,
      assistantMessageId: assistantMessageId,
      content: message2,
    });
  },
});

export const getName = queryWithAuth({
  args: {
    chatId: v.id("chats"),
  },
  handler: async (ctx, { chatId }) => {
    const chat = await ctx.db.get(chatId);
    return chat?.name;
  },
});

export const deleteChat = mutationWithAuth({
  args: {
    id: v.id("chats"),
    courseSlug: v.string(),
  },
  handler: async (ctx, { id, courseSlug }) => {
    const { course } = await getCourseRegistration(
      ctx.db,
      ctx.session,
      courseSlug,
    );

    const chat = await ctx.db.get(id);
    if (!chat) {
      throw new ConvexError("Chat not found");
    }

    if (chat.courseId !== course._id) {
      throw new ConvexError("Unauthorized to delete this chat");
    }

    if (!ctx.session) {
      throw new ConvexError("Logged out");
    }

    if (chat.userId !== ctx.session.user._id) {
      throw new ConvexError("Forbidden");
    }

    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_chat", (q) => q.eq("chatId", id))
      .collect();

    for (const message of messages) {
      await ctx.db.delete(message._id);
    }

    await ctx.db.delete(id);
  },
});

export const rename = mutationWithAuth({
  args: {
    id: v.id("chats"),
    newName: v.string(),
    courseSlug: v.string(),
  },
  handler: async (ctx, { id, newName, courseSlug }) => {
    const { course } = await getCourseRegistration(
      ctx.db,
      ctx.session,
      courseSlug,
    );

    const chat = await ctx.db.get(id);
    if (!chat) {
      throw new ConvexError("Chat not found");
    }

    if (chat.courseId !== course._id) {
      throw new ConvexError("Unauthorized to update this feedback");
    }

    if (!ctx.session) {
      throw new ConvexError("Logged out");
    }

    if (chat.userId !== ctx.session.user._id) {
      throw new ConvexError("Forbidden");
    }

    await ctx.db.patch(id, { name: newName });
    return { success: true };
  },
});
