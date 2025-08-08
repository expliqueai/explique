"use node";

import sharp from "sharp";
import { actionWithAuth } from "../auth/withAuth";
import { v } from "convex/values";
import OpenAI from "openai";

import { validateExerciseInCourse } from "./exercises";
import { StorageActionWriter } from "convex/server";
import { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import { getCourseRegistration } from "../courses";
import { ConvexError } from "convex/values";

export default actionWithAuth({
  args: {
    prompt: v.string(),
    exerciseId: v.optional(v.id("exercises")),
    lectureId: v.optional(v.id("lectures")),
    courseSlug: v.string(),
  },
  handler: async (ctx, { prompt, exerciseId, lectureId, courseSlug }) => {
    if (!exerciseId && !lectureId) {
      throw new ConvexError("Either exerciseId or lectureId must be provided");
    }

    await getCourseRegistration(ctx, ctx.session, courseSlug, "admin");

    // Validate the entity exists
    if (exerciseId) {
      await validateExerciseInCourse(ctx, courseSlug, exerciseId);
    } else if (lectureId) {
      const lecture = await ctx.runQuery(internal.lectures.get, {
        id: lectureId,
      });
      if (!lecture) {
        throw new ConvexError("Lecture not found");
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

    if (!opanaiResponse.data || opanaiResponse.data.length === 0) {
      throw new ConvexError("No image generated");
    }

    const imageUrl = opanaiResponse.data[0].url!;

    const blob = await (await fetch(imageUrl)).blob();
    const storageId = await ctx.storage.store(blob);

    const thumbnails = [
      await generateThumbnail(blob, ctx.storage, "image/avif"),
      await generateThumbnail(blob, ctx.storage, "image/webp"),
      await generateThumbnail(blob, ctx.storage, "image/jpeg"),
    ];

    const imageId: Id<"images"> = await ctx.runMutation(
      internal.admin.image.store,
      {
        storageId,
        thumbnails,
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

async function generateThumbnail(
  image: Blob,
  storage: StorageActionWriter,
  type: "image/webp" | "image/avif" | "image/jpeg",
) {
  const width = 600;
  const format =
    type === "image/webp" ? "webp" : type === "image/avif" ? "avif" : "jpeg";

  const newBuffer = await sharp(Buffer.from(await image.arrayBuffer()))
    .resize({ width })
    .toFormat(format)
    .toBuffer();

  const storageId = await storage.store(
    new Blob([new Uint8Array(newBuffer)], { type }),
  );

  return {
    type,
    storageId,
  };
}
