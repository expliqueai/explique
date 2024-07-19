import { ConvexError, v } from "convex/values";
import { queryWithAuth, mutationWithAuth } from "./auth/withAuth";
import { getCourseRegistration } from "./courses";
import { Doc, Id } from "./_generated/dataModel";
import { generateId } from "lucia";



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
        content: v.string(),
        storageIds: v.id("_storage"),
    },
    handler: async (ctx, { courseSlug, content, storageIds }) => {
        const { course } = await getCourseRegistration(
            ctx.db,
            ctx.session,
            courseSlug,
        );

        await ctx.db.insert("feedbacks", {
            courseId: course._id,
            content: content,
            image: storageIds
        });
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