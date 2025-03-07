import { ConvexError, v } from "convex/values";
import { queryWithAuth } from "../auth/withAuth";
import { getCourseRegistration } from "../courses";
import { internalMutation } from "../_generated/server";

export const list = queryWithAuth({
  args: {
    courseSlug: v.string(),
    exerciseId: v.id("exercises"),
  },
  handler: async (ctx, args) => {
    await getCourseRegistration(ctx.db, ctx.session, args.courseSlug, "admin");

    // Verify that the exercise is in this course
    const exercise = await ctx.db.get(args.exerciseId);
    if (!exercise) {
      throw new ConvexError("Exercise not found");
    }

    const weekId = exercise.weekId;
    if (weekId === null) {
      throw new ConvexError("The exercise has been deleted");
    }

    const week = await ctx.db.get(weekId);
    if (!week) {
      throw new Error("Week not found");
    }
    const course = await ctx.db.get(week.courseId);
    if (!course) {
      throw new Error("Course not found");
    }
    if (course.slug !== args.courseSlug) {
      throw new ConvexError("Exercise not found");
    }

    const images = await ctx.db
      .query("images")
      .withIndex("by_exercise_id", (q) => q.eq("exerciseId", args.exerciseId))
      .collect();

    const result = [];

    for (const image of images) {
      const resultThumbnails = [];
      for (const thumbnail of image.thumbnails) {
        const thumbnailSrc = await ctx.storage.getUrl(thumbnail.storageId);
        if (!thumbnailSrc) continue;

        resultThumbnails.push({
          ...thumbnail,
          src: thumbnailSrc,
        });
      }

      const src = await ctx.storage.getUrl(image.storageId);
      if (!src) continue;

      result.push({
        ...image,
        thumbnails: resultThumbnails,
        src,
      });
    }

    return result;
  },
});

export const store = internalMutation({
  args: {
    storageId: v.id("_storage"),
    thumbnails: v.array(
      v.object({
        type: v.string(),
        storageId: v.id("_storage"),
        sizes: v.optional(v.string()),
      }),
    ),
    model: v.string(),
    size: v.string(),
    prompt: v.string(),
    quality: v.union(v.literal("standard"), v.literal("hd")),
    exerciseId: v.id("exercises"),
  },
  handler: async (ctx, row) => {
    return await ctx.db.insert("images", row);
  },
});
