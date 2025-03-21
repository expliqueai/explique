import { ConvexError, v } from "convex/values";
import {
  actionWithAuth,
  mutationWithAuth,
  queryWithAuth,
} from "../auth/withAuth";
import {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
} from "@google/generative-ai";
import {
  ActionCtx,
  internalAction,
  internalMutation,
  internalQuery,
} from "../_generated/server";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";

const SYSTEM_PROMPT = `
You are an AI language model designed to assist users in navigating and understanding the content of a video. Your capabilities include answering questions about specific moments in the video using the preprocessed data provided. You can also suggest insightful questions to help users explore the video content more deeply.

Instructions for User Interaction:
- Allow the user to ask questions related to specific timestamps in the video.
- Utilize the processed video and audio data efficiently to answer inquiries.
- Provide clear, concise, and informative answers based on the content at the specified timestamps.
- Offer to guide the user to related or relevant segments of the video if needed.
- Suggest potential questions the user may find interesting on the topics of the video.
- Do not describe what's happening on the video segment except if it is useful for your answer. The user is watching the video, so he already knows.
- Do not answer a question that is not related to the video or to the subject of the video. (e.g.: Make a react component...)
- Make your answers as concise as possible.
- Before answering, check if the segment contains an error. If so, ONLY provide the next timestamp where you can answer and say that you cannot safely provide an answer because there was an error in the video processing.

Important: You MUST use markdown to format your messages and LaTeX for math equations or math symbols. For example, you can use the following syntax to write a math formula: $x^2 + y^2 = z^2$.
Important: You MUST put timestamps inside <timestamp> and </timestamp> tags. NEVER mention anything about the preprocessed video segments, events and slides. These are keywords used internally by you to differenciate data.
Important: All timestamps are formatted as hh:mm:ss.

Ensure all interactions are concise and accurate, based on the comprehensive preprocessed data, while maintaining a friendly and helpful tone to assist the user in understanding the video's educational content. Strive for brevity while ensuring all information is rooted in the data above, fostering a deeper understanding of the video's educational content through thoughtful dialog.

---

Video data:

Important: The timestamp of the beginning of a segment is inclusive but the timestamp of the end of a segment is exclusive.

`;

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

    // Get lecture using internal query instead of direct db access
    const lecture = await ctx.runQuery(internal.video.chat._getLecture, {
      lectureId: args.lectureId,
    });

    if (!lecture) {
      throw new ConvexError("Lecture not found");
    }

    await ctx.runMutation(internal.video.chat._createChat, {
      lectureId: args.lectureId,
      userId: ctx.session.user._id,
    });
  },
});

// Internal query to get lecture data
export const _getLecture = internalQuery({
  args: {
    lectureId: v.id("lectures"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.lectureId);
  },
});

export const _createChat = internalMutation({
  args: {
    lectureId: v.id("lectures"),
    userId: v.id("users"),
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

    if (!lecture.modelName) {
      throw new ConvexError("This lecture hasn't been initialized yet");
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

    await ctx.scheduler.runAfter(0, internal.video.chat.answerWithGemini, {
      message: args.message,
      modelName: lecture.modelName,
      lectureChatId: chat._id,
      systemMessageId,
    });
  },
});

// Function to build conversation history from lectureChatMessages
export const _getConversationHistory = internalQuery({
  args: {
    lectureChatId: v.id("lectureChats"),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("lectureChatMessages")
      .withIndex("by_lecture_chat_id", (q) =>
        q.eq("lectureChatId", args.lectureChatId),
      )
      .collect();

    // Sort messages by _creationTime to ensure correct order
    const sortedMessages = [...messages].sort(
      (a, b) => a._creationTime - b._creationTime,
    );

    // Build conversation history in Gemini format
    // Pair user messages with system responses
    const history = [];
    for (let i = 0; i < sortedMessages.length; i += 2) {
      const userMessage = sortedMessages[i];
      const systemMessage = sortedMessages[i + 1];

      // Only add complete message pairs to history
      if (
        userMessage &&
        !userMessage.system &&
        systemMessage &&
        systemMessage.system &&
        systemMessage.appearance !== "typing" &&
        systemMessage.appearance !== "error"
      ) {
        history.push(
          { role: "user", parts: [{ text: userMessage.content }] },
          { role: "model", parts: [{ text: systemMessage.content }] },
        );
      }
    }

    return history;
  },
});

// Function for Gemini
export const answerWithGemini = internalAction({
  args: {
    message: v.string(),
    modelName: v.string(),
    lectureChatId: v.id("lectureChats"),
    systemMessageId: v.id("lectureChatMessages"),
  },
  handler: async (ctx, args) => {
    try {
      // Import the utility functions
      const {
        getGeminiClient,
        getDefaultSafetySettings,
        defaultGenerationConfig,
      } = await import("./geminiUtils");

      // Get lecture data to include in system prompt
      const lecture = await ctx.runQuery(internal.video.chat._getLecture, {
        lectureId: await ctx.runQuery(internal.video.chat._getChatLectureId, {
          lectureChatId: args.lectureChatId,
        }),
      });

      // Get conversation history from messages
      const chatHistory = await ctx.runQuery(
        internal.video.chat._getConversationHistory,
        {
          lectureChatId: args.lectureChatId,
        },
      );

      // Combine system prompt with lecture chunks
      const enhancedSystemPrompt =
        SYSTEM_PROMPT + (lecture?.chunks?.join("\n") || "");

      const genAI = getGeminiClient();
      const model = genAI.getGenerativeModel({
        model: args.modelName,
        systemInstruction: enhancedSystemPrompt,
      });

      // Create a new chat with history from messages
      const chat = model.startChat({
        generationConfig: defaultGenerationConfig,
        safetySettings: getDefaultSafetySettings(),
        history: chatHistory,
      });

      // Send the message to Gemini and get the response
      const result = await chat.sendMessage(args.message);
      const response = result.response.text();

      // Update the system message with the response
      await ctx.runMutation(internal.video.chat.writeSystemResponse, {
        systemMessageId: args.systemMessageId,
        appearance: undefined,
        content: response,
      });
    } catch (err) {
      console.error("Error generating response from Gemini:", err);
      await sendError(ctx, args.systemMessageId);
    }
  },
});

// Add this query to get lecture ID from lecture chat
export const _getChatLectureId = internalQuery({
  args: {
    lectureChatId: v.id("lectureChats"),
  },
  handler: async (ctx, args) => {
    const chat = await ctx.db.get(args.lectureChatId);
    if (!chat) {
      throw new ConvexError("Chat not found");
    }
    return chat.lectureId;
  },
});

// Keep the existing functions for writing responses
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
