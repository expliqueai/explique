import { ConvexError, v } from "convex/values";
import { queryWithAuth, mutationWithAuth, actionWithAuth } from "./auth/withAuth";
import { getCourseRegistration } from "./courses";
import OpenAI from "openai";
import { internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";

export const getName = queryWithAuth({
  args: {
    feedbackId: v.id("feedbacks"),
  },
  handler: async ({ db }, { feedbackId }) => {
    const feedback = await db.get(feedbackId);
    return feedback?.name;
  },
});

export const getCreationTime = queryWithAuth({
  args: {
    feedbackId: v.id("feedbacks"),
  },
  handler: async ({ db }, { feedbackId }) => {
    const feedback = await db.get(feedbackId);
    return feedback?._creationTime;
  },
});

export const data = queryWithAuth({
  args: {
    courseSlug: v.string(),
  },
  handler: async ({ db, session }, { courseSlug }) => {
    if (!session) throw new ConvexError("Not logged in");
    const { course } = await getCourseRegistration(db, session, courseSlug);

    const feedbacks = await db
      .query("feedbacks")
      .withIndex("by_key", (q) => q.eq("userId", session.user._id).eq("courseId", course._id))
      .collect();

    const chats = await db
      .query("chats")
      .withIndex("by_key", (q) => q.eq("userId", session.user._id).eq("courseId", course._id))
      .collect();

    const result : {id:string, creationTime:number, lastModified:number, name:string|undefined, type:string}[] = [];

    for (const fb of feedbacks) {
      result.push({
        id: fb._id,
        creationTime: fb._creationTime,
        lastModified: fb.lastModified,
        name: fb.name,
        type: "feedback",
      });
    };

    for (const chat of chats) {
      result.push({
        id: chat._id,
        creationTime: chat._creationTime,
        lastModified: chat.lastModified,
        name: chat.name,
        type: "chat",
      });
    };

    return result;
  },
});


export const generateFirstMessages = internalAction({
  args: {
    fileUrl: v.string(),
    courseId: v.id("courses"),
    userId: v.id("users"),
    storageId: v.id("_storage"),
    feedbackId: v.id("feedbacks"),
  },
  handler: async (ctx, { fileUrl, courseId, storageId, feedbackId }) => {

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

    const urls = await ctx.runQuery(internal.admin.sadatabase.getUrls, { courseId:courseId });
    const message1 : OpenAI.Chat.Completions.ChatCompletionContentPart[] = [];
    message1.push({
      type:"text",
      text:"Here is the solution to the exercises. If I ask for the solution but my tentative solution is not perfect, tell me \"I cannot give you the solution.\" and don't give me the solution.",
    });
    for (const url of urls) {
      message1.push({
        type:"image_url",
        image_url:{
          url:url,
        },
      });
    };

    await ctx.runMutation(
      internal.feedbackmessages.insertMessage,
      {
        feedbackId:feedbackId,
        role:"user",
        content:message1,
      }
    );
    messages.push({
      role:"user",
      content:message1,
    });

    const message2 : OpenAI.Chat.Completions.ChatCompletionContentPart[] = [];
    message2.push({
      type:"text",
      text:"Here is my tentative solution. Tell me what exercise I am working on. And then, please give me feedback.",
    });
    message2.push({
      type:"image_url",
      image_url:{
        url:fileUrl,
      },
    });

    await ctx.runMutation(
      internal.feedbackmessages.insertMessage,
      {
        feedbackId:feedbackId,
        role:"user",
        content:message2,
      }
    );
    messages.push({
      role:"user",
      content:message2,
    });

    const openai = new OpenAI();

    const feedback = await openai.chat.completions.create(
      {
        model: "gpt-4o",
        messages: messages,
        temperature: 0.3,
        stream: false,
      },
      {
        timeout: 3 * 60 * 1000, // 3 minutes
      }
    );
    const message3 = feedback.choices[0]?.message?.content ?? "";

    await ctx.runMutation(
      internal.feedbackmessages.insertMessage,
      {
        feedbackId:feedbackId,
        role:"assistant",
        content:message3,
      }
    );
  },
});

export const generateFeedback = mutationWithAuth({
  args: {
    courseSlug: v.string(),
    storageId: v.id("_storage"),
    name: v.string(),
  }, 
  handler: async (ctx, { courseSlug, storageId, name }) => {
    if (!ctx.session) throw new ConvexError("Not logged in");
    const userId = ctx.session.user._id;

    const { course } = await getCourseRegistration(
      ctx.db,
      ctx.session,
      courseSlug,
    );
    
    const feedbackId = await ctx.db.insert("feedbacks", {
      userId: userId,
      status: "feedback",
      courseId: course._id,
      images: [storageId],
      name : (name !== "") ? name : undefined,
      lastModified: 0,
    });

    const feedback = await ctx.db.get(feedbackId);

    await ctx.db.patch(feedbackId, {
      lastModified: feedback?._creationTime,
    })

    const fileUrl = await ctx.storage.getUrl(storageId);

    if (fileUrl) {      // schedule the action to generate feedback
      await ctx.scheduler.runAfter(0, internal.feedback.generateFirstMessages, {
        fileUrl: fileUrl,
        courseId: course._id,
        userId: userId,
        storageId: storageId,
        feedbackId: feedbackId,
      });
    };

    return feedbackId;
  },
});

export const generateUpdateMessages = internalAction({
  args: {
    fileUrl: v.string(),
    courseId: v.id("courses"),
    userId: v.id("users"),
    storageId: v.id("_storage"),
    feedbackId: v.id("feedbacks"),
  },
  handler: async (ctx, { fileUrl, courseId, storageId, feedbackId }) => {
    const message : OpenAI.Chat.Completions.ChatCompletionContentPart[] = [];
    message.push({
      type:"text",
      text:"Here is a new try I made on the exercise. Analyze what is different from the previous attempt I made and tell me if I am closer to something correct or not. Give me feedback on what is different. Make sure the attempt is on the same exercise as before and that it is not a picture I already gave you.",
    });
    message.push({
      type:"image_url",
      image_url:{
        url:fileUrl,
      },
    });

    const userMessageId = await ctx.runMutation(
      internal.feedbackmessages.insertMessage,
      {
        feedbackId:feedbackId,
        role:"user",
        content:message,
      }
    );

    const assistantMessageId = await ctx.runMutation(
      internal.feedbackmessages.insertMessage,
      {
        feedbackId:feedbackId,
        role:"assistant",
        content:"",
        appearance: "typing",
      }
    );

    await ctx.scheduler.runAfter(0, internal.feedbackmessages.answerChatCompletionsApi, {
      feedbackId,
      userMessageId,
      assistantMessageId,
    });
  },
});

export const updateFeedback = mutationWithAuth({
  args: {
    courseSlug: v.string(),
    storageId: v.id("_storage"),
    feedbackId: v.id("feedbacks"),
  }, 
  handler: async (ctx, { courseSlug, storageId, feedbackId }) => {
    if (!ctx.session) throw new ConvexError("Not logged in");
    const userId = ctx.session.user._id;

    const { course } = await getCourseRegistration(
      ctx.db,
      ctx.session,
      courseSlug,
    );

    const fileUrl = await ctx.storage.getUrl(storageId);
    if (fileUrl) {      // schedule the action to generate feedback
      await ctx.scheduler.runAfter(0, internal.feedback.generateUpdateMessages, {
        fileUrl: fileUrl,
        courseId: course._id,
        userId: userId,
        storageId: storageId,
        feedbackId: feedbackId,
      });
    };

    const feedback = await ctx.db.get(feedbackId);
    if (feedback) {
      const timestamp = Date.now();
      await ctx.db.patch(feedbackId, {
        status: "feedback",
        lastModified: timestamp,
        images: [storageId].concat(feedback.images)
      });
    };
  },
});

export const getImage = queryWithAuth({
  args: {
    feedbackId: v.id("feedbacks"),
  },
  handler: async (ctx, { feedbackId }) => {
    const feedback = await ctx.db.get(feedbackId);
    if (feedback === null) return null;
    return await ctx.storage.getUrl(feedback.images[0]);
  }
})

export const get = queryWithAuth({
  args: {
    feedbackId: v.id("feedbacks"),
  },
  handler: async (ctx, { feedbackId }) => {
    return await ctx.db.get(feedbackId);
  },
});


export const generateUploadUrl = mutationWithAuth({
  args: {},
  handler: async (ctx, {}) => {
    return await ctx.storage.generateUploadUrl();
  },
});


export const goToChat = mutationWithAuth({
  args: {
    feedbackId: v.id("feedbacks"),
  },
  handler: async (ctx, { feedbackId }) => {

    const timestamp = Date.now();

    await ctx.db.patch(feedbackId, {
      status:"chat",
      lastModified: timestamp,
    });

  },
});



export const deleteFeedback = mutationWithAuth({
    args: {
      id: v.id("feedbacks"),
      courseSlug: v.string(),
    },
    handler: async (ctx, { id, courseSlug }) => {
      const { course } = await getCourseRegistration(
        ctx.db,
        ctx.session,
        courseSlug,
      );
  
      const feedback = await ctx.db.get(id);
      if (!feedback) {
        throw new ConvexError("Feedback not found");
      }

      if (feedback.courseId !== course._id) {
        throw new ConvexError("Unauthorized to delete this feedback");
      }

      if (!ctx.session) {
        throw new ConvexError("Logged out");
      }

      if (feedback.userId !== ctx.session.user._id) {
        throw new ConvexError("Forbidden");
      }
  
      for (const image of feedback.images) {
        await ctx.storage.delete(image);
      }

      await ctx.scheduler.runAfter(0, 
        internal.feedbackmessages.deleteMessages,
        {
          feedbackId:feedback._id,
        }
      );      
  
      await ctx.db.delete(id);
    },
});


export const rename = mutationWithAuth({
  args: {
    id: v.id("feedbacks"),
    newName: v.string(),
    courseSlug: v.string(),
  },
  handler: async (ctx, { id, newName, courseSlug }) => {
    const { course } = await getCourseRegistration(
      ctx.db,
      ctx.session,
      courseSlug,
    );

    const feedback = await ctx.db.get(id);
    if (!feedback) {
      throw new ConvexError("Feedback not found");
    }

    if (feedback.courseId !== course._id) {
      throw new ConvexError("Unauthorized to update this feedback");
    }

    if (!ctx.session) {
      throw new ConvexError("Logged out");
    }

    if (feedback.userId !== ctx.session.user._id) {
      throw new ConvexError("Forbidden");
    }

    await ctx.db.patch(id, { name:newName });
    return { success:true };
  },
});