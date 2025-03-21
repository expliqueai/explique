import { ConvexError, v } from "convex/values";
import {
  action,
  ActionCtx,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
} from "../_generated/server";
import { api, internal } from "../_generated/api";
import { LECTURE_STATUS, lectureSchema } from "../schema";
import {
  actionWithAuth,
  mutationWithAuth,
  queryWithAuth,
} from "../auth/withAuth";
import { getCourseRegistration } from "../courses";
import { Id } from "../_generated/dataModel";
import { getImageForLecture } from "../lectures";
import OpenAI from "openai";

export const get = queryWithAuth({
  args: {
    id: v.id("lectures"),
    courseSlug: v.string(),
  },
  handler: async ({ db, session }, { id, courseSlug }) => {
    await getCourseRegistration(db, session, courseSlug, "admin");

    const lecture = await db.get(id);
    if (!lecture) {
      throw new ConvexError("Lecture not found");
    }

    const { weekId } = lecture;
    if (weekId === null) {
      throw new ConvexError("The lecture has been deleted");
    }

    return { ...lecture, weekId };
  },
});

export const list = queryWithAuth({
  args: {
    courseSlug: v.string(),
  },
  handler: async ({ db, session, storage }, { courseSlug }) => {
    const { course } = await getCourseRegistration(
      db,
      session,
      courseSlug,
      "admin",
    );

    const weeks = await db
      .query("weeks")
      .withIndex("by_course_and_start_date", (q) =>
        q.eq("courseId", course._id),
      )
      .order("desc")
      .collect();

    // @TODO Only query the lectures from this course
    const lectures = await db.query("lectures").collect();

    const result = [];
    for (const week of weeks) {
      const resultLectures = [];
      for (const lecture of lectures) {
        if (lecture.weekId === week._id) {
          resultLectures.push({
            id: lecture._id,
            name: lecture.name,
            url: lecture.url,
            image: await getImageForLecture(db, storage, lecture),
          });
        }
      }

      result.push({
        ...week,
        lectures: resultLectures,
      });
    }

    return result;
  },
});

export const insertRow = internalMutation({
  args: { ...lectureSchema },
  handler: async ({ db }, row) => {
    return await db.insert("lectures", row);
  },
});

export const updateRow = internalMutation({
  args: {
    id: v.id("lectures"),
    row: v.object({
      name: v.optional(v.string()),
      weekId: v.optional(v.union(v.id("weeks"), v.null())),
      image: v.optional(v.id("images")),
      url: v.optional(v.string()),
      status: v.optional(LECTURE_STATUS),
      modelName: v.optional(v.string()),
      chunks: v.optional(v.array(v.string())),
    }),
  },
  handler: async ({ db }, { id, row }) => {
    // Verify that the course isn't changed
    const existing = await db.get(id);
    if (!existing) {
      throw new ConvexError("Lecture not found");
    }

    // Only validate weekId if it's being updated
    if (row.weekId !== undefined) {
      const oldWeekId = existing.weekId;
      const newWeekId = row.weekId;

      if (newWeekId === null) {
        throw new ConvexError("Invalid data");
      }

      if (oldWeekId === null) {
        throw new ConvexError("Can't unpublish this lecture");
      }

      // Verify that the lecture stays in the same course
      const oldWeek = await db.get(oldWeekId);
      const newWeek = await db.get(newWeekId);
      if (!oldWeek || !newWeek || newWeek.courseId !== oldWeek.courseId) {
        throw new ConvexError("The course of an exercise cannot be changed");
      }
    }

    return await db.patch(id, row);
  },
});

export const createInternal = internalAction({
  args: lectureSchema,
  handler: async ({ runMutation }, row): Promise<Id<"lectures">> => {
    return await runMutation(internal.admin.lectures.insertRow, {
      ...{ ...row, sessionId: undefined },
    });
  },
});

export const create = actionWithAuth({
  args: {
    courseSlug: v.string(),
    lecture: v.object(lectureSchema),
  },
  handler: async (ctx, { courseSlug, lecture }): Promise<Id<"lectures">> => {
    const { course } = await getCourseRegistration(
      ctx,
      ctx.session,
      courseSlug,
      "admin",
    );

    const { weekId } = lecture;
    if (weekId === null) {
      throw new ConvexError("Invalid week ID");
    }

    // Validate the week ID
    const week = await ctx.runQuery(internal.admin.weeks.getInternal, {
      id: weekId,
    });
    if (!week || week.courseId !== course._id) {
      throw new ConvexError("Invalid week");
    }

    const id = await ctx.runAction(
      internal.admin.lectures.createInternal,
      lecture,
    );

    await ctx.scheduler.runAfter(0, internal.admin.lectures.processVideo, {
      lectureId: id,
      url: lecture.url,
    });

    return id;
  },
});

export const processVideo = internalAction({
  args: {
    lectureId: v.id("lectures"),
    url: v.string(),
  },
  handler: async (ctx, { lectureId, url }) => {
    try {
      // Check for the processing URL environment variable
      const processingUrl = process.env.LECTURES_PROCESSING_URL;
      if (!processingUrl) {
        throw new Error(
          "LECTURES_PROCESSING_URL environment variable is not configured",
        );
      }

      const response = await fetch(processingUrl, {
        method: "POST",
        body: JSON.stringify({
          url,
          convexUrl: process.env.CONVEX_CLOUD_URL,
          lectureId,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok || !response.body) {
        throw new Error(
          `Failed to start video processing: ${response.statusText}`,
        );
      }

      await ctx.runMutation(api.admin.lectures.setStatus, {
        lectureId,
        status: "PROCESSING",
        authToken: process.env.VIDEO_PROCESSING_API_TOKEN!,
      });
    } catch (error) {
      await ctx.runMutation(api.admin.lectures.setStatus, {
        lectureId,
        status: "FAILED",
        authToken: process.env.VIDEO_PROCESSING_API_TOKEN!,
      });

      throw error;
    }
  },
});

export const createAssistant = action({
  args: {
    lectureId: v.id("lectures"),
    authToken: v.string(),
  },
  handler: async (ctx, { lectureId, authToken }) => {
    if (authToken !== process.env.VIDEO_PROCESSING_API_TOKEN) {
      throw new ConvexError("Invalid authentification token");
    }

    const chunks = await ctx.runQuery(internal.admin.lectures.getChunks, {
      lectureId,
    });
    if (!chunks) {
      throw new ConvexError("Lecture chunks not found");
    }

    await ctx.runMutation(api.admin.lectures.setAssistantId, {
      lectureId,
      modelName: "gemini-2.0-flash-thinking-exp-01-21",
      authToken,
    });
  },
});

export const getChunks = internalQuery({
  args: {
    lectureId: v.id("lectures"),
  },
  handler: async (ctx, { lectureId }) => {
    const lecture = await ctx.db.get(lectureId);
    if (!lecture) {
      throw new ConvexError("Lecture not found");
    }
    return lecture.chunks || [];
  },
});

export const setAssistantId = mutation({
  args: {
    lectureId: v.id("lectures"),
    modelName: lectureSchema.modelName,
    authToken: v.string(),
  },
  handler: async (ctx, { lectureId, authToken, modelName }) => {
    if (authToken !== process.env.VIDEO_PROCESSING_API_TOKEN) {
      throw new ConvexError("Invalid authentification token");
    }

    return await ctx.db.patch(lectureId, { modelName });
  },
});

export const setStatus = mutation({
  args: {
    lectureId: v.id("lectures"),
    status: LECTURE_STATUS,
    authToken: v.string(),
  },
  handler: async (ctx, { lectureId, status, authToken }) => {
    if (authToken !== process.env.VIDEO_PROCESSING_API_TOKEN) {
      throw new ConvexError("Invalid authentification token");
    }

    return await ctx.db.patch(lectureId, { status: status });
  },
});

export const addChunk = mutation({
  args: {
    lectureId: v.id("lectures"),
    chunk: v.string(),
    authToken: v.string(),
  },
  handler: async (ctx, { lectureId, chunk, authToken }) => {
    if (authToken !== process.env.VIDEO_PROCESSING_API_TOKEN) {
      throw new ConvexError("Invalid authentification token");
    }

    const lecture = await ctx.db.get(lectureId);
    if (!lecture) {
      throw new ConvexError("Lecture not found");
    }

    return await ctx.db.patch(lectureId, {
      chunks: [...(lecture.chunks || []), chunk],
    });
  },
});

export const courseSlugOfLecture = internalQuery({
  args: {
    id: v.id("lectures"),
  },
  handler: async (ctx, args) => {
    const lecture = await ctx.db.get(args.id);
    if (!lecture) {
      throw new ConvexError("Lecture not found");
    }

    const weekId = lecture.weekId;
    if (weekId === null) {
      throw new ConvexError("This lecture has been deleted");
    }
    const week = await ctx.db.get(weekId);
    if (!week) {
      throw new ConvexError("Week not found");
    }

    const course = await ctx.db.get(week.courseId);
    if (!course) {
      throw new ConvexError("Course not found");
    }

    return course.slug;
  },
});

export async function validateLectureInCourse(
  ctx: Omit<ActionCtx, "auth">,
  courseSlug: string,
  id: Id<"lectures">,
) {
  const lectureCourseSlug = await ctx.runQuery(
    internal.admin.lectures.courseSlugOfLecture,
    { id },
  );
  if (lectureCourseSlug !== courseSlug) {
    throw new ConvexError("Lecture not found");
  }
}

export const update = actionWithAuth({
  args: {
    id: v.id("lectures"),
    lecture: v.object({
      name: v.optional(v.string()),
      weekId: v.optional(v.union(v.id("weeks"), v.null())),
      image: v.optional(v.id("images")),
      url: v.optional(v.string()),
      status: v.optional(LECTURE_STATUS),
      modelName: v.optional(v.string()),
      chunks: v.optional(v.array(v.string())),
    }),
    courseSlug: v.string(),
  },
  handler: async (ctx, { id, lecture, courseSlug }) => {
    await getCourseRegistration(ctx, ctx.session, courseSlug, "admin");
    await validateLectureInCourse(ctx, courseSlug, id);

    await ctx.runMutation(internal.admin.lectures.updateRow, {
      id,
      row: lecture,
    });
  },
});

export const softDelete = mutationWithAuth({
  args: {
    id: v.id("lectures"),
    courseSlug: v.string(),
  },
  handler: async (ctx, { id, courseSlug }) => {
    const { course } = await getCourseRegistration(
      ctx.db,
      ctx.session,
      courseSlug,
      "admin",
    );

    const lecture = await ctx.db.get(id);
    if (!lecture) {
      throw new ConvexError("Lecture not found");
    }

    const weekId = lecture.weekId;
    if (weekId === null) {
      throw new ConvexError("The lecture has already been deleted");
    }

    const week = await ctx.db.get(weekId);
    if (!week) {
      throw new Error("Week not found");
    }
    if (week.courseId !== course._id) {
      throw new ConvexError("Lecture not found");
    }

    await ctx.db.patch(lecture._id, { weekId: null });
  },
});

export const getInternal = internalQuery({
  args: {
    id: v.id("lectures"),
  },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});
