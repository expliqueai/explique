import { internalMutation, DatabaseReader, MutationCtx, internalAction, internalQuery } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { Session, queryWithAuth, mutationWithAuth } from "./auth/withAuth";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import OpenAI from "openai";


async function getAttemptIfAuthorized(
    db: DatabaseReader,
    session: Session | null,
    feedbackId: Id<"feedbacks">,
  ) {
    if (!session) {
      throw new ConvexError("Logged out");
    }
  
    const attempt = await db.get(feedbackId);
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
        feedbackId: v.id("feedbacks"),
    },
    handler: async (ctx, { feedbackId }) => {
        await getAttemptIfAuthorized(ctx.db, ctx.session, feedbackId);

        return await ctx.db
                        .query("feedbackMessages")
                        .withIndex("by_feedback", (x) => x.eq("feedbackId", feedbackId))
                        .collect();
    },
});


export const insertMessage = internalMutation({
    args: {
        feedbackId: v.id("feedbacks"),
        role: v.union(v.literal("user"), v.literal("system"), v.literal("assistant")),
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
    handler: async ({ db }, { feedbackId, role, content }) => {
        return await db.insert("feedbackMessages", { feedbackId, content, role });
    },
});


export const getFeedback = queryWithAuth({
    args: {
        feedbackId: v.id("feedbacks"),
    },
    handler: async (ctx, { feedbackId }) => {
        const feedback = await ctx
                                .db
                                .query("feedbackMessages")
                                .withIndex("by_feedback", (x) => x.eq("feedbackId", feedbackId))
                                .filter((x) => x.eq(x.field("role"), "assistant"))
                                .first()

        if (feedback === null || typeof feedback.content !== "string") return undefined;
        return feedback.content;
    },
});


async function sendMessageController(
    ctx: Omit<MutationCtx, "auth">,
    {
        message,
        feedbackId,
    }: {
        feedbackId: Id<"feedbacks">;
        message: string;
    },
    ) {
    const feedback = await ctx.db.get(feedbackId);
    if (!feedback) throw new Error(`Feedback ${feedbackId} not found`);

    const userMessageId = await ctx.db.insert("feedbackMessages", {
        feedbackId,
        role: "user",
        content: message,
    });

    const assistantMessageId = await ctx.db.insert("feedbackMessages", {
        feedbackId,
        role: "assistant",
        appearance: "typing",
        content: "",
    });

    ctx.scheduler.runAfter(0, internal.feedbackmessages.answerChatCompletionsApi, {
        feedbackId,
        userMessageId,
        assistantMessageId,
    });
};


export const generateTranscriptMessages = internalQuery({
    args: {
      feedbackId: v.id("feedbacks"),
    },
    handler: async ({ db }, { feedbackId }) => {
        const feedbackMessages = await db
            .query("feedbackMessages")
            .withIndex("by_feedback", (q) => q.eq("feedbackId", feedbackId))
            .collect();
        
        const messages : OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

        const instructions = "\
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
      
        messages.push({
            role:"system",
            content:instructions,
        });
        
        for (const feedbackMessage of feedbackMessages) {
            if (feedbackMessage.appearance) continue;
            if (feedbackMessage.role === "system" && typeof feedbackMessage.content === "string") {
                messages.push({
                    role:"system",
                    content:feedbackMessage.content,
                })
            } else if (feedbackMessage.role === "user") {
                messages.push({
                    role:"user",
                    content:feedbackMessage.content,
                })
            } else if (feedbackMessage.role === "assistant" && typeof feedbackMessage.content === "string") {
                messages.push({
                    role:"assistant",
                    content:feedbackMessage.content,
                })
            };
        };
            
        return messages;
    },
});


export const writeSystemResponse = internalMutation({
    args: {
      feedbackId: v.id("feedbacks"),
      userMessageId: v.id("feedbackMessages"),
      assistantMessageId: v.id("feedbackMessages"),
      content: v.string(),
      appearance: v.optional(v.union(v.literal("finished"), v.literal("error"))),
    },
    handler: async (
      { db },
      { feedbackId, userMessageId, assistantMessageId, content, appearance },
    ) => {
      const feedback = await db.get(feedbackId);
      if (!feedback) {
        throw new Error("Can’t find the attempt");
      }
  
      await db.patch(assistantMessageId, { content, appearance });
    },
});


export const answerChatCompletionsApi = internalAction({
    args: {
      feedbackId: v.id("feedbacks"),
      userMessageId: v.id("feedbackMessages"),
      assistantMessageId: v.id("feedbackMessages"),
    },
    handler: async (
      ctx,
      {
        feedbackId,
        userMessageId,
        assistantMessageId,
      },
    ) => {
      const openai = new OpenAI();
  
      const messages = await ctx.runQuery(
        internal.feedbackmessages.generateTranscriptMessages,
        {
          feedbackId,
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
        await ctx.runMutation(internal.feedbackmessages.writeSystemResponse, {
          feedbackId,
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
        await ctx.runMutation(internal.feedbackmessages.writeSystemResponse, {
          feedbackId,
          userMessageId,
          assistantMessageId,
          appearance: "error",
          content: "",
        });
      } else {
        await ctx.runMutation(internal.feedbackmessages.writeSystemResponse, {
          feedbackId,
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
      feedbackId: v.id("feedbacks"),
      message: v.string(),
    },
    handler: async (ctx, { feedbackId, message }) => {
      
      const attempt = await getAttemptIfAuthorized(
        ctx.db,
        ctx.session,
        feedbackId,
      );
      if (attempt.status === "feedback")
        throw new ConvexError("Not in the chat part");
  
      await sendMessageController(ctx, {
        message,
        feedbackId,
      });
      
    },
});


export const deleteMessages = internalMutation({
  args: {
    feedbackId: v.id("feedbacks"),
  },
  handler: async (ctx, { feedbackId }) => {
    const messages = await ctx
                            .db
                            .query("feedbackMessages")
                            .withIndex("by_feedback", (x) => x.eq("feedbackId", feedbackId))
                            .collect();
    
    const ids = messages.map(({ _id }) => _id);
    for (const id of ids) {
      ctx.db.delete(id);
    }
  },
});
