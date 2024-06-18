import { ConvexError, v } from "convex/values";
import { actionWithAuth, queryWithAuth } from "../auth/withAuth";
import { validateExerciseInCourse } from "./exercises";
import OpenAI from "openai";
import { internalMutation } from "../_generated/server";
import { StorageActionWriter } from "convex/server";
import { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import { getCourseRegistration } from "../courses";

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
    const week = await ctx.db.get(exercise.weekId);
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

export const generate = actionWithAuth({
  args: {
    prompt: v.string(),
    exerciseId: v.id("exercises"),
    courseSlug: v.string(),
  },
  handler: async (ctx, { prompt, exerciseId, courseSlug }) => {
    await getCourseRegistration(ctx, ctx.session, courseSlug, "admin");
    await validateExerciseInCourse(ctx, courseSlug, exerciseId);

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
    exerciseId: v.id("exercises"),
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
