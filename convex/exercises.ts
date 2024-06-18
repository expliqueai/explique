import { ConvexError, v } from "convex/values";
import { queryWithAuth } from "./auth/withAuth";
import { DatabaseReader, internalQuery } from "./_generated/server";
import { getCourseRegistration } from "./courses";
import { Doc, Id } from "./_generated/dataModel";
import { StorageReader } from "convex/server";

export const getRow = internalQuery({
  args: {
    id: v.id("exercises"),
  },
  handler: async ({ db }, { id }) => {
    return await db.get(id);
  },
});

export const getLastAttempt = queryWithAuth({
  args: {
    exerciseId: v.id("exercises"),
  },
  handler: async ({ db, session }, { exerciseId }) => {
    if (!session) {
      throw new ConvexError("Not logged in");
    }

    const attempt = await db
      .query("attempts")
      .withIndex("by_key", (x) =>
        x.eq("userId", session.user._id).eq("exerciseId", exerciseId),
      )
      .order("desc") // latest attempt
      .first();

    return attempt ? attempt._id : null;
  },
});

export async function getImageForExercise(
  db: DatabaseReader,
  storage: StorageReader,
  exercise: Doc<"exercises">,
) {
  if (!exercise.image) {
    return null;
  }

  const imageRow = await db.get(exercise.image);
  if (!imageRow) {
    console.warn("Image not found for exercise", exercise._id);
    return null;
  }

  const thumbnails = [];
  for (const thumbnail of imageRow.thumbnails) {
    const thumbnailUrl = await storage.getUrl(thumbnail.storageId);
    if (!thumbnailUrl) {
      continue;
    }

    thumbnails.push({
      type: thumbnail.type,
      sizes: thumbnail.sizes,
      src: thumbnailUrl,
    });
  }

  return {
    thumbnails,
  };
}

export const list = queryWithAuth({
  args: {
    courseSlug: v.string(),
  },
  handler: async ({ db, session, storage }, { courseSlug }) => {
    if (!session) throw new ConvexError("Not logged in");
    const { course, registration } = await getCourseRegistration(
      db,
      session,
      courseSlug,
    );

    const { user } = session;

    const now = +new Date();
    const weeks = await db
      .query("weeks")
      .withIndex("by_course_and_start_date", (q) =>
        q
          .eq("courseId", course._id)
          .lte(
            "startDate",
            registration.role === "admin" || registration.role === "ta"
              ? Number.MAX_VALUE
              : now,
          ),
      )
      .order("desc")
      .collect();
    const exercises = await db.query("exercises").collect();

    const result = [];
    for (const week of weeks) {
      const exercisesResult = [];
      for (const exercise of exercises.filter((x) => x.weekId === week._id)) {
        exercisesResult.push({
          id: exercise._id,
          name: exercise.name,
          image: await getImageForExercise(db, storage, exercise),
          completed: registration.completedExercises.includes(exercise._id),
        });
      }

      result.push({
        id: week._id,
        name: week.name,
        startDate: week.startDate,
        endDate: week.endDate,
        endDateExtraTime: user.extraTime ? week.endDateExtraTime : null,
        exercises: exercisesResult,
        preview: week.startDate > now,
      });
    }
    return result;
  },
});
