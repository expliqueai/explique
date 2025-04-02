import { ConvexError, v } from "convex/values";
import {
  actionWithAuth,
  mutationWithAuth,
  queryWithAuth,
} from "../auth/withAuth";
import {
  ActionCtx,
  internalAction,
  internalMutation,
  internalQuery,
} from "../_generated/server";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import { lectureSchema } from "../schema";

const SYSTEM_PROMPT = `
You are an AI language model designed to assist users in navigating and understanding the content of a video. Your capabilities include answering questions about specific moments in the video using the preprocessed data provided. You can also suggest insightful questions to help users explore the video content more deeply.

**Understanding the Provided Data:**
- The video data below is structured into segments, each containing slides and events (audio transcripts, visual actions).
- **Crucially, the content within each \`<slide>\` is now enriched with descriptive HTML-like tags (e.g., \`<title>\`, \`<subtitle>\`, \`<bullet_point>\`, \`<paragraph>\`, \`<chart_analysis>\`, \`<diagram_description>\`, \`<image_description>\`) that provide context about the type of information presented.** These tags help identify the structure and nature of the content on the screen.
- Some slides may contain detailed \`<chart_analysis>\` with specific tags for components like \`<chart_title>\`, \`<axis_label>\`, \`<data_point>\`, etc., or \`<diagram_description>\`.
- Visual events (\`<event type="visual_clue">\`) may reference the specific tagged content being interacted with (e.g., "highlights '<bullet_point>Key Concept</bullet_point>'").
- Some diagrams or charts might include TikZ code within \`<diagram_tikz>\` or \`<chart_tikz>\` tags for technical representation. You should rely on the \`<diagram_description>\` and \`<chart_analysis>\` for understanding, not the TikZ code itself unless specifically asked.

**Instructions for User Interaction:**
- Utilize the structured video and audio data efficiently to answer inquiries. Leverage the descriptive tags within slides to quickly understand the context and hierarchy of information (e.g., identify a title versus a list item).
- Provide clear, concise, and informative answers based *only* on the content within the provided \`<video_data>\`.
- **Do NOT expose the internal descriptive tags (e.g., \`<title>\`, \`<bullet_point>\`, \`<chart_analysis>\`) in your answers to the user.** Synthesize the information and present it naturally in plain language or appropriate markdown. The only exception is if quoting a visual event description that *already* includes such a tag reference as part of the provided data.
- Offer to guide the user to related or relevant segments of the video if needed.
- Suggest potential questions the user may find interesting based on the video's topics.
- Do not describe what's happening on the video segment except if it is useful for your answer. The user is watching the video, so they already know.
- Do not answer questions unrelated to the video content or subject matter (e.g., coding requests, general knowledge).
- Make your answers as concise as possible.
- Provide timestamps for the user to refer to the video content when you cite specific information from the video.
- Before answering, check if the relevant segment contains a PROCESSING error note. If so, ONLY provide the next timestamp where you can answer and state that you cannot safely provide an answer due to a video processing issue.

**Formatting Requirements:**
- **Timestamps:** You MUST put all timestamps inside \`<timestamp>hh:mm:ss</timestamp>\` tags.
- **Math:** You MUST use LaTeX for math equations or symbols (e.g., \`$x^2 + y^2 = z^2$\`).
- **General Output:** You MUST use Markdown for formatting your messages (e.g., lists, bold text).
- **Internal Keywords:** NEVER mention anything about the preprocessed "video segments," "events," "slides," or the internal descriptive tags (like \`<title>\`, \`<bullet_point>\`) used in the data structure. These terms and tags are for your internal processing only and should not be part of your response to the user.

**User Context:**
- You will receive the user's current timestamp in the video at the beginning of each message. You can use this for context (e.g., answering "what was just said?"), but it's not always necessary (e.g., for a full video summary).

Ensure all interactions are concise and accurate, based on the comprehensive preprocessed data, while maintaining a friendly and helpful tone. Strive for brevity while ensuring all information is rooted in the data, fostering a deeper understanding of the video's educational content through thoughtful dialog.

---

Video data:

Important: The timestamp of the beginning of a segment is inclusive but the timestamp of the end of a segment is exclusive.

`;

const FALLBACK_MODEL = "gemini-2.0-flash";

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
        isFallbackModel: message.isFallbackModel,
      })),
    };
  },
});

export const initialize = actionWithAuth({
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
      firstMessage: lecture.firstMessage,
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
    firstMessage: lectureSchema.firstMessage,
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

    const chatId = await ctx.db.insert("lectureChats", {
      lectureId: args.lectureId,
      userId: args.userId,
    });

    // Add welcome message from the system
    if (args.firstMessage) {
      await ctx.db.insert("lectureChatMessages", {
        lectureChatId: chatId,
        content: args.firstMessage,
        system: true,
      });
    }
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
      lectureId: args.lectureId,
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
    lectureId: v.id("lectures"),
    lectureChatId: v.id("lectureChats"),
    systemMessageId: v.id("lectureChatMessages"),
  },
  handler: async (ctx, args) => {
    // Import the utility functions
    const {
      getGeminiClient,
      getDefaultSafetySettings,
      defaultGenerationConfig,
    } = await import("./geminiUtils");

    try {
      // Get lecture data to include in system prompt
      const lecture = await ctx.runQuery(internal.video.chat._getLecture, {
        lectureId: args.lectureId,
      });

      if (!lecture) {
        throw new ConvexError("Lecture not found");
      }

      // Get conversation history from messages
      const chatHistory = await ctx.runQuery(
        internal.video.chat._getConversationHistory,
        {
          lectureChatId: args.lectureChatId,
        },
      );

      if (lecture.chunks.length === 0) {
        throw new ConvexError("Lecture chunks not found");
      }

      // Combine system prompt with lecture chunks
      const enhancedSystemPrompt =
        SYSTEM_PROMPT + (lecture?.chunks?.join("\n") || "");

      const genAI = getGeminiClient();

      // Try with original model first
      try {
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

        return; // Successfully completed with primary model
      } catch (primaryError) {
        const fallbackModel = genAI.getGenerativeModel({
          model: FALLBACK_MODEL,
          systemInstruction: enhancedSystemPrompt,
        });

        const fallbackChat = fallbackModel.startChat({
          generationConfig: defaultGenerationConfig,
          safetySettings: getDefaultSafetySettings(),
          history: chatHistory,
        });

        const fallbackResult = await fallbackChat.sendMessage(args.message);
        const fallbackResponse = fallbackResult.response.text();

        await ctx.runMutation(internal.video.chat.writeSystemResponse, {
          systemMessageId: args.systemMessageId,
          appearance: undefined,
          content: fallbackResponse,
          isFallbackModel: true,
        });
      }
    } catch (err) {
      console.error(
        "Error generating response, even with fallback model:",
        err,
      );
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
    isFallbackModel: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.systemMessageId, {
      content: args.content,
      appearance: args.appearance,
      isFallbackModel: args.isFallbackModel,
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

export const clearHistory = mutationWithAuth({
  args: {
    lectureId: v.id("lectures"),
  },
  handler: async (ctx, args) => {
    if (!ctx.session) {
      throw new ConvexError("Unauthenticated");
    }

    const chat = await ctx.db
      .query("lectureChats")
      .withIndex("by_lecture_and_user", (q) =>
        q.eq("lectureId", args.lectureId).eq("userId", ctx.session!.user._id),
      )
      .first();

    if (chat) {
      const messages = await ctx.db
        .query("lectureChatMessages")
        .withIndex("by_lecture_chat_id", (q) => q.eq("lectureChatId", chat._id))
        .collect();

      for (const message of messages) {
        await ctx.db.delete(message._id);
      }
    }
  },
});
