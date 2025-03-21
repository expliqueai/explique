import { ConvexError, v } from "convex/values";
import {
  action,
  ActionCtx,
  internalMutation,
} from "../_generated/server";
import { StorageActionWriter } from "convex/server";
import { api, internal } from "../_generated/api";
import { actionWithAuth, queryWithAuth } from "../auth/withAuth";
import { getCourseRegistration } from "../courses";
import OpenAI from "openai";
import { Id } from "../_generated/dataModel";

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

export const generate = actionWithAuth({
  args: {
    prompt: v.string(),
    exerciseId: v.optional(v.id("exercises")),
    lectureId: v.optional(v.id("lectures")),
    courseSlug: v.string(),
  },
  handler: async (ctx, { prompt, exerciseId, lectureId, courseSlug }) => {
    await getCourseRegistration(ctx, ctx.session, courseSlug, "admin");

    if (!exerciseId && !lectureId) {
      throw new ConvexError("Either exerciseId or lectureId must be provided");
    }

    // Validate that the item belongs to the course
    if (exerciseId) {
      // Validate that exerciseId belongs to courseSlug
      try {
        const exerciseCourseSlug = await ctx.runQuery(internal.admin.exercises.courseSlugOfExercise, {
          id: exerciseId,
        });
        if (exerciseCourseSlug !== courseSlug) {
          throw new ConvexError("Exercise not found in course");
        }
      } catch (e) {
        throw new ConvexError("Exercise not found in course");
      }
    } else if (lectureId) {
      // Validate that lectureId belongs to courseSlug
      const lectureCourseSlug = await ctx.runQuery(
        internal.admin.lectures.courseSlugOfLecture,
        { id: lectureId }
      );
      if (lectureCourseSlug !== courseSlug) {
        throw new ConvexError("Lecture not found in course");
      }
    }

    const model = "dall-e-3";
    const size = "1792x1024";
    const quality = "hd";

    const openai = new OpenAI();
    const opanaiResponse = await openai.images.generate({
      model,
      prompt,
      n: 1,
      size,
      quality,
    });
    const imageUrl = opanaiResponse.data[0].url!;

    const blob = await (await fetch(imageUrl)).blob();
    const storageId = await ctx.storage.store(blob);

    const imageId: Id<"images"> = await ctx.runMutation(
      internal.admin.image.store,
      {
        storageId,
        thumbnails: [
          await generateThumbnail(imageUrl, ctx.storage, "image/avif"),
          await generateThumbnail(imageUrl, ctx.storage, "image/webp"),
          await generateThumbnail(imageUrl, ctx.storage, "image/jpeg"),
        ],
        model,
        size,
        quality,
        exerciseId,
        lectureId,
        prompt,
      },
    );

    return imageId;
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

async function generateThumbnail(
  url: string,
  storage: StorageActionWriter,
  type: "image/webp" | "image/avif" | "image/jpeg",
) {
  const res = await fetch("https://cs250.epfl.ch/api/admin/compress", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      key: "5570f676-ddbb-415b-939b-c1adf66fc4fc",
      url,
      format:
        type === "image/webp"
          ? "webp"
          : type === "image/avif"
            ? "avif"
            : "jpeg",
      width: 600,
    }),
  });
  const blob = await res.blob();
  const storageId = await storage.store(blob);

  return {
    type,
    storageId,
  };
}
