import { ConvexError, v } from "convex/values";
import { queryWithAuth } from "../auth/withAuth";
import { getCourseRegistration } from "../courses";
import { internalMutation } from "../_generated/server";

export const list = queryWithAuth({
  args: {
    courseSlug: v.string(),
    exerciseId: v.optional(v.id("exercises")),
    lectureId: v.optional(v.id("lectures")),
  },
  handler: async (ctx, args) => {
    await getCourseRegistration(ctx.db, ctx.session, args.courseSlug, "admin");

    if (!args.exerciseId && !args.lectureId) {
      throw new ConvexError("Either exerciseId or lectureId must be provided");
    }

    let images;
    if (args.exerciseId) {
      // For exercises
      const exercise = await ctx.db.get(args.exerciseId);
      if (!exercise) {
        throw new ConvexError("Exercise not found");
      }

      images = await ctx.db
        .query("images")
        .withIndex("by_exercise", (q) => q.eq("exerciseId", args.exerciseId!))
        .collect();
    } else {
      // For lectures
      const lecture = await ctx.db.get(args.lectureId!);
      if (!lecture) {
        throw new ConvexError("Lecture not found");
      }

      images = await ctx.db
        .query("images")
        .withIndex("by_lecture", (q) => q.eq("lectureId", args.lectureId!))
        .collect();
    }

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
    exerciseId: v.optional(v.id("exercises")),
    lectureId: v.optional(v.id("lectures")),
  },
  handler: async (ctx, row) => {
    return await ctx.db.insert("images", row);
  },
});
