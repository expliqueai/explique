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



export const generateFeedback = mutationWithAuth({
    args: {
      courseSlug: v.string(),
      file: v.any(), // Use appropriate validator for the file if possible
    },
    handler: async (ctx, { courseSlug, file }) => {
      // Generate feedback using OpenAI
      const feedbackContent = ""; 
      //await getFeedback(file);

      const { course } = await getCourseRegistration(
        ctx.db,
        ctx.session,
        courseSlug, // admin ?
    );

  
      // Save the feedback to the database
      const feedbackId = await ctx.db.insert("feedbacks", {
        courseId: course._id,
        image: undefined,
        content: feedbackContent,
      });

      return feedbackId; 
  
    }
  });