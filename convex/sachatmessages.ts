import { internalMutation, DatabaseReader, MutationCtx, internalAction, internalQuery } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { Session, queryWithAuth, mutationWithAuth } from "./auth/withAuth";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import OpenAI from "openai";

export const insertMessage = internalMutation({
    args: {
        chatId: v.id("chats"),
        assistant: v.boolean(),
        content: v.union(v.string(), v.array(v.union(
            v.object({ 
                type:v.literal("text"), 
                text:v.string(),
            }), v.object({
                type:v.literal("image_url"),
                image_url:v.object({ url:v.string() }),
            })
        ))),
        appearance: v.optional(v.union(v.literal("finished"), v.literal("feedback"), v.literal("typing"), v.literal("error"))),
    },
    handler: async ({ db }, { chatId, assistant, content, appearance }) => {
        return await db.insert("chatMessages", { chatId, content, assistant, appearance });
    },
});


async function getAttemptIfAuthorized(
    db: DatabaseReader,
    session: Session | null,
    chatId: Id<"chats">,
  ) {
    if (!session) {
      throw new ConvexError("Logged out");
    }
  
    const attempt = await db.get(chatId);
    if (attempt === null) throw new ConvexError("Unknown attempt");
  
    const registration = await db
      .query("registrations")
      .withIndex("by_user_and_course", (q) =>
        q.eq("userId", session.user._id).eq("courseId", attempt.courseId),
      )
      .first();
    if (!registration) throw new Error("User not enrolled in the course.");
  
    if (attempt.userId !== session.user._id && registration.role !== "admin") {
      throw new ConvexError("Forbidden");
    }
  
    return attempt;
};


export const list = queryWithAuth({
    args: {
        chatId: v.id("chats"),
    },
    handler: async (ctx, { chatId }) => {
        await getAttemptIfAuthorized(ctx.db, ctx.session, chatId);

        return await ctx.db
                        .query("chatMessages")
                        .withIndex("by_chat", (x) => x.eq("chatId", chatId))
                        .collect();
    },
});


async function sendMessageController(
    ctx: Omit<MutationCtx, "auth">,
    {
        message,
        chatId,
    }: {
        chatId: Id<"chats">;
        message: string;
    },
    ) {
    const chat = await ctx.db.get(chatId);
    if (!chat) throw new Error(`Chat ${chatId} not found`);

    const userMessageId = await ctx.db.insert("chatMessages", {
        chatId,
        assistant: false,
        content: message,
    });

    const assistantMessageId = await ctx.db.insert("chatMessages", {
        chatId,
        assistant: true,
        appearance: "typing",
        content: "",
    });

    ctx.scheduler.runAfter(0, internal.sachatmessages.answerChatCompletionsApi, {
        chatId,
        userMessageId,
        assistantMessageId,
    });
};


export const generateTranscriptMessages = internalQuery({
    args: {
      chatId: v.id("chats"),
    },
    handler: async ({ db }, { chatId }) => {
        const chatMessages = await db
            .query("chatMessages")
            .withIndex("by_chat", (q) => q.eq("chatId", chatId))
            .collect();
        
        const messages : OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

        const instructions = "\
        You are an assistant for a course. You are given the exercises and corresponding solutions.\
        \
        A student is coming to you because they have tried to solve one of the exercises but is stuck. They need help to start it.\
        \
        First make sure that the student understood the problem statement and what is asked in the exercise. Then, if they are still stuck, you can give them hints on how to start the \
        exercise. But never give them the solution to the exercise, even if they ask for it. Your answer should be short and only contain between 1 and 5 sentences.";
      
        messages.push({
            role:"system",
            content:instructions,
        });
        
        for (const chatMessage of chatMessages) {
            if (chatMessage.appearance) continue;
            if (chatMessage.assistant && typeof chatMessage.content === "string") {
                messages.push({
                    role:"assistant",
                    content:chatMessage.content,
                })
            } else if (!chatMessage.assistant) {
                messages.push({
                    role:"user",
                    content:chatMessage.content,
                })
            }
        };
            
        return messages;
    },
});


export const writeSystemResponse = internalMutation({
    args: {
      chatId: v.id("chats"),
      assistantMessageId: v.id("chatMessages"),
      content: v.string(),
      appearance: v.optional(v.union(v.literal("finished"), v.literal("error"))),
    },
    handler: async (
      { db },
      { chatId, assistantMessageId, content, appearance },
    ) => {
      const chat = await db.get(chatId);
      if (!chat) {
        throw new Error("Can’t find the attempt");
      }
  
      await db.patch(assistantMessageId, { content, appearance });
    },
});


export const answerChatCompletionsApi = internalAction({
    args: {
      chatId: v.id("chats"),
      userMessageId: v.id("chatMessages"),
      assistantMessageId: v.id("chatMessages"),
    },
    handler: async (
      ctx,
      {
        chatId,
        userMessageId,
        assistantMessageId,
      },
    ) => {
      const openai = new OpenAI();
  
      const messages = await ctx.runQuery(
        internal.sachatmessages.generateTranscriptMessages,
        {
          chatId,
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
        await ctx.runMutation(internal.sachatmessages.writeSystemResponse, {
          chatId,
          assistantMessageId,
          appearance: "error",
          content: "",
        });
        return;
      }
  
      const message = response.choices[0].message;
      if (!message.content) {
        console.error("No content in the response", message);
        await ctx.runMutation(internal.sachatmessages.writeSystemResponse, {
          chatId,
          assistantMessageId,
          appearance: "error",
          content: "",
        });
      } else {
        await ctx.runMutation(internal.sachatmessages.writeSystemResponse, {
          chatId,
          assistantMessageId,
          appearance: undefined,
          content: message.content,
        });
      }
    },
});


export const sendMessage = mutationWithAuth({
    args: {
      chatId: v.id("chats"),
      message: v.string(),
    },
    handler: async (ctx, { chatId, message }) => {
      
      const attempt = await getAttemptIfAuthorized(
        ctx.db,
        ctx.session,
        chatId,
      );
  
      await sendMessageController(ctx, {
        message,
        chatId,
      });

      const timestamp = Date.now();
      await ctx.db.patch(chatId, {
        lastModified: timestamp,
      });
    },
});

