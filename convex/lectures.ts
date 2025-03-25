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

    // FIXME: Only query the lectures from this course
    const lectures = await db
      .query("lectures")
      .filter((q) => q.eq(q.field("status"), "READY"))
      .collect();

    const lecturesWithChunks = lectures.filter(
      (lecture) => lecture.chunks.length > 0,
    );

    const result = [];
    for (const week of weeks) {
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
        endDate: week.endDate,
        lectures: lecturesResult,
        preview: week.startDate > now,
      });
    }
    return result;
  },
});
