import { ConvexError, v } from "convex/values";
import { queryWithAuth, mutationWithAuth } from "./auth/withAuth";
import { getCourseRegistration } from "./courses";
import { Doc, Id } from "./_generated/dataModel";
import { generateId } from "lucia";
import OpenAI from "openai";
import openai from "openai";
import { Completions } from "openai/resources";
import { internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";



export const listFeedbacks = queryWithAuth({
  args: {
    courseSlug: v.string(),
  },
  handler: async ({ db, session }, { courseSlug }) => {
    if (!session) throw new ConvexError("Not logged in");
    const { course } = await getCourseRegistration(db, session, courseSlug);

    const feedbacks = await db
      .query("feedbacks")
      .withIndex("by_course", (q) => q.eq("courseId", course._id))
      .collect();

    return feedbacks.map(fb => ({
      id: fb._id,
      feedback: fb.content,
      image: fb.image ?? null,
    }));
  },
});



// export const generateFeedback = mutationWithAuth({
//     args: {
//       courseSlug: v.string(),
//       storageId : v.id("_storage"), // Use appropriate validator for the file if possible
//     },
//     handler: async (ctx, { courseSlug, storageId }) => {
//       // Generate feedback using OpenAI

//       const feedbackContent = ""; 
//       //await getFeedback(file);

//       const { course } = await getCourseRegistration(
//         ctx.db,
//         ctx.session,
//         courseSlug, // admin ?
//     );

  
//       // Save the feedback to the database
//       const feedbackId = await ctx.db.insert("feedbacks", {
//         courseId: course._id,
//         image: storageId,
//         content: feedbackContent,
//       });

//       return feedbackId; 
  
//     }
//   });


  export const generateFeedback = mutationWithAuth({
    args: {
        courseSlug: v.string(),
        storageIds: v.id("_storage"),
    },
    handler: async (ctx, { courseSlug, storageIds }) => {

        const { course } = await getCourseRegistration(
            ctx.db,
            ctx.session,
            courseSlug,
        );

        const fileUrl = await ctx.storage.getUrl(storageIds);
        

        const feedbackId = await ctx.db.insert("feedbacks", {
            courseId: course._id,
            content: "Generating feedback...",
            image: storageIds,
          });
    
          if (fileUrl) {
          // Schedule the action to generate feedback
            await ctx.scheduler.runAfter(0, internal.feedback.generateFeedbackFromOpenAI, {
                courseId: course._id,
                fileUrl : fileUrl,
                storageId: storageIds,
                feedbackId: feedbackId,
            });
        } 
    
          return feedbackId;
    
    },
});


export const generateUploadUrl = mutationWithAuth({
    args: {},
    handler: async (ctx, {}) => {
        return await ctx.storage.generateUploadUrl();
    },
});

// export const getUrl = queryWithAuth({
//     args: {
//         courseSlug: v.string(),
//         name: v.string(),
//     },
//     handler: async (ctx, {courseSlug, name}) => {
//         const { course } = await getCourseRegistration(
//             ctx.db,
//             ctx.session,
//             courseSlug,
//         );

//         const files = await ctx.db
//             .query("saDatabase")
//             .withIndex("by_course", (q) =>
//                 q.eq("courseId", course._id),
//             )
//             .collect()
        
//         const file = files.find(file => file.name === name);
//         const storageId = file?.storageIds.find(obj => obj.pageNumber === 0)?.storageId;
//         if (file === undefined || storageId === undefined) {
//             return null;
//         } else {
//             return await ctx.storage.getUrl(storageId);
//         }
//     },
//   });

export const generateFeedbackFromOpenAI = internalAction({
    args: {
      fileUrl: v.string(),
      courseId: v.id("courses"),
      storageId: v.id("_storage"),
      feedbackId: v.id("feedbacks"),
    },
    handler: async (ctx, { fileUrl, courseId, storageId, feedbackId }) => {
      const prompt = `Analyze the following image and provide feedback: ${fileUrl}`;
      
      const openai = new OpenAI();
      const response = await openai.chat.completions.create(
        {
          model: "gpt-4o",
          messages: [{ role: "system", content: prompt }],
          temperature: 0.3,
          stream: false,
        },
        {
          timeout: 3 * 60 * 1000, // 3 minutes
        }
      );
  
      const finalResponse = response.choices[0]?.message?.content ?? "";
  
      // Update the feedback entry with the generated content
      await ctx.runMutation(internal.feedback.updateFeedback, {
        feedbackId,
        response: finalResponse,
      });
    },
  });
  
  export const updateFeedback = internalMutation({
    args: {
      feedbackId: v.id("feedbacks"),
      response: v.string(),
    },
    handler: async (ctx, { feedbackId, response }) => {
      await ctx.db.patch(feedbackId, {
        content: response,
      });
    },
  });


export const getFeedback = queryWithAuth({
    args: { feedbackId: v.id('feedbacks') },
    handler: async (ctx, { feedbackId }) => {
      const feedback = await ctx.db.get(feedbackId);
      if (!feedback) {
        throw new Error('Feedback not found');
      }
      return feedback;
    },
  });