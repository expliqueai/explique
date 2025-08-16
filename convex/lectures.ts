import { ConvexError, v } from "convex/values";
import { queryWithAuth } from "./auth/withAuth";
import {
  DatabaseReader,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { getCourseRegistration } from "./courses";
import { Doc, Id } from "./_generated/dataModel";
import { StorageReader } from "convex/server";

export const getMetadata = queryWithAuth({
  args: {
    lectureId: v.id("lectures"),
  },
  handler: async ({ db, session }, { lectureId }) => {
    if (!session) {
      throw new ConvexError("Not logged in");
    }

    const lecture = await db.get(lectureId);
    if (!lecture) {
      throw new ConvexError("Lecture not found");
    }

    return {
      name: lecture.name,
      url: lecture.url,
    };
  },
});

export const get = internalQuery({
  args: {
    id: v.id("lectures"),
  },
  handler: async ({ db }, { id }) => {
    return await db.get(id);
  },
});

export async function getImageForLecture(
  db: DatabaseReader,
  storage: StorageReader,
  lecture: Doc<"lectures">,
) {
  if (!lecture.image) {
    return null;
  }

  const imageRow = await db.get(lecture.image);
  if (!imageRow) {
    console.warn("Image not found for lecture", lecture._id);
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

    // Get lecture weeks first
    const lectureWeeks = await db
      .query("lectureWeeks")
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

    // Get week IDs to filter lectures
    const weekIds = lectureWeeks.map((week) => week._id);

    // Only query lectures for the current course weeks and with READY status
    // Use a more efficient query by filtering on the weekId index
    const lecturesForCourse = [];
    for (const weekId of weekIds) {
      const weekLectures = await db
        .query("lectures")
        .withIndex("by_week_id", (q) => q.eq("weekId", weekId))
        .filter((q) => q.eq(q.field("status"), "READY"))
        .collect();
      lecturesForCourse.push(...weekLectures);
    }

    // Filter lectures that have chunks
    const lecturesWithChunks = [];
    for (const lecture of lecturesForCourse) {
      const hasChunks = await db
        .query("lectureChunks")
        .withIndex("by_lecture_id", (q) => q.eq("lectureId", lecture._id))
        .first();

      if (hasChunks) {
        lecturesWithChunks.push(lecture);
      }
    }

    const result = [];
    for (const week of lectureWeeks) {
      const lecturesResult = [];
      for (const lecture of lecturesWithChunks.filter(
        (x) => x.weekId === week._id,
      )) {
        lecturesResult.push({
          id: lecture._id,
          name: lecture.name,
          url: lecture.url,
          image: await getImageForLecture(db, storage, lecture),
        });
      }

      result.push({
        id: week._id,
        name: week.name,
        startDate: week.startDate,
        lectures: lecturesResult,
      });
    }
    return result;
  },
});
