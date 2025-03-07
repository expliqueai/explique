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

export default actionWithAuth({
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
          await generateThumbnail(blob, ctx.storage, "image/avif"),
          await generateThumbnail(blob, ctx.storage, "image/webp"),
          await generateThumbnail(blob, ctx.storage, "image/jpeg"),
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

  const storageId = await storage.store(new Blob([newBuffer], { type }));

  return {
    type,
    storageId,
  };
}
