// Tool to export/import courses between Explique deployments

import { v } from "convex/values";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../_generated/server";
import { exerciseAdminSchema } from "../schema";
import { internal } from "../_generated/api";
import { createAssistant } from "../admin/exercises";
import { Id } from "../_generated/dataModel";
import { StorageActionWriter } from "convex/server";

const exportSchema = v.array(
  v.object({
    name: v.string(),
    startDate: v.number(),
    endDate: v.number(),
    endDateExtraTime: v.number(),

    exercises: v.array(
      v.object({
        name: v.string(),
        instructions: v.string(),
        model: v.string(),
        chatCompletionsApi: v.optional(v.literal(true)),
        feedback: v.optional(
          v.object({
            model: v.string(),
            prompt: v.string(),
          }),
        ),
        text: v.string(),
        quiz: v.union(
          v.object({
            batches: v.array(
              v.object({
                randomize: v.optional(v.boolean()),
                questions: v.array(
                  v.object({
                    question: v.string(),
                    answers: v.array(
                      v.object({
                        text: v.string(),
                        correct: v.boolean(),
                      }),
                    ),
                  }),
                ),
              }),
            ),
          }),
          v.null(),
        ),
        firstMessage: v.optional(v.string()),
        controlGroup: v.union(
          v.literal("A"),
          v.literal("B"),
          v.literal("none"),
          v.literal("all"),
        ),
        completionFunctionDescription: v.string(),
        imagePrompt: v.optional(v.string()),

        image: v.optional(
          v.object({
            sourceUrl: v.string(),
            thumbnails: v.array(
              v.object({
                type: v.string(),
                sourceUrl: v.string(),
                sizes: v.optional(v.string()),
              }),
            ),
            model: v.string(),
            size: v.string(),
            prompt: v.string(),
            quality: v.union(v.literal("standard"), v.literal("hd")),
          }),
        ),
      }),
    ),
  }),
);

export const exportCourse = internalQuery(
  async (
    { db, storage },
    { courseId }: { courseId?: Id<"courses"> }
  ) => {
    // fetch all weeks/exercises/images (assuming single course)
    const weeks = await db.query("weeks").collect();
    const exercises = await db.query("exercises").collect();
    const images = await db.query("images").collect();

    return await Promise.all(
      weeks.map(async (week) => {
        // build each week object
        const exercisesForWeek = await Promise.all(
          exercises
            .filter((ex) => ex.weekId === week._id)
            .map(async (exercise) => {
              // bundle image data if present
              let image;
              if (exercise.image) {
                const imgMeta = images.find((i) => i._id === exercise.image)!;
                const sourceUrl = await storage.getUrl(imgMeta.storageId);
                if (!sourceUrl) throw new Error("Can’t find full image");

                const thumbnails = await Promise.all(
                  imgMeta.thumbnails.map(async (thumb) => {
                    const thumbUrl = await storage.getUrl(imgMeta.storageId);
                    if (!thumbUrl) throw new Error("Can’t find thumbnail");
                    return {
                      type: thumb.type,
                      sizes: thumb.sizes,
                      sourceUrl: thumbUrl,
                    };
                  })
                );

                image = {
                  sourceUrl,
                  thumbnails,
                  model: imgMeta.model,
                  size: imgMeta.size,
                  prompt: imgMeta.prompt,
                  quality: imgMeta.quality,
                };
              }

              return {
                name: exercise.name,
                instructions: exercise.instructions,
                model: exercise.model,
                chatCompletionsApi: exercise.chatCompletionsApi,
                feedback: exercise.feedback,
                text: exercise.text,
                quiz: exercise.quiz,
                firstMessage: exercise.firstMessage,
                controlGroup: exercise.controlGroup,
                completionFunctionDescription:
                  exercise.completionFunctionDescription,
                imagePrompt: exercise.imagePrompt,
                image,
              };
            })
        );

        return {
          name: week.name,
          startDate: week.startDate,
          endDate: week.endDate,
          endDateExtraTime: week.endDateExtraTime,
          exercises: exercisesForWeek,
        };
      })
    );
  }
);

async function downloadContents(
  url: string,
  storage: StorageActionWriter,
): Promise<Id<"_storage">> {
  const blob = await (await fetch(url)).blob();
  const id = await storage.store(blob);
  return id;
}

export const importCourse = internalAction({
  args: {
    courseId: v.id("courses"),
    weeks: exportSchema,
  },
  handler: async (ctx, { courseId, weeks }) => {
    await ctx.runMutation(internal.superadmin.relocation.saveImportedCoures, {
      courseId,
      weeks: await Promise.all(
        weeks.map(async (week) => ({
          object: {
            name: week.name,
            startDate: week.startDate,
            endDate: week.endDate,
            endDateExtraTime: week.endDateExtraTime,
          },
          exercises: await Promise.all(
            week.exercises.map(async (exercise) => ({
              object: {
                assistantId: (
                  await createAssistant(
                    exercise.instructions,
                    exercise.model,
                    exercise.completionFunctionDescription,
                  )
                ).id,
                ...{ ...exercise, image: undefined },
              },
              image: exercise.image
                ? {
                    storageId: await downloadContents(
                      exercise.image.sourceUrl,
                      ctx.storage,
                    ),
                    thumbnails: await Promise.all(
                      exercise.image.thumbnails.map(async (thumbnail) => ({
                        type: thumbnail.type,
                        storageId: await downloadContents(
                          thumbnail.sourceUrl,
                          ctx.storage,
                        ),
                        sizes: thumbnail.sizes,
                      })),
                    ),
                    model: exercise.image.model,
                    size: exercise.image.size,
                    prompt: exercise.image.prompt,
                    quality: exercise.image.quality,
                  }
                : undefined,
            })),
          ),
        })),
      ),
    });
  },
});

export const saveImportedCoures = internalMutation({
  args: {
    courseId: v.id("courses"),
    weeks: v.array(
      v.object({
        object: v.object({
          name: v.string(),
          startDate: v.number(),
          endDate: v.number(),
          endDateExtraTime: v.number(),
        }),
        exercises: v.array(
          v.object({
            object: v.object({
              assistantId: v.string(),
              ...exerciseAdminSchema,
              weekId: v.optional(v.any()),
            }),
            image: v.optional(
              v.object({
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
              }),
            ),
          }),
        ),
      }),
    ),
  },
  handler: async ({ db }, { courseId, weeks }) => {
    for (const week of weeks) {
      const weekId = await db.insert("weeks", {
        ...week.object,
        courseId,
      });
      for (const exercise of week.exercises) {
        const exerciseId = await db.insert("exercises", {
          ...exercise.object,
          weekId,
          image: undefined,
        });

        if (exercise.image) {
          const imageId = await db.insert("images", {
            ...exercise.image,
            exerciseId,
          });
          await db.patch(exerciseId, { image: imageId });
        }
      }
    }
  },
});
