import { ConvexError, v } from "convex/values";
import {
  ActionCtx,
  internalAction,
  internalMutation,
  internalQuery,
} from "../_generated/server";
import { internal } from "../_generated/api";
import { lectureSchema } from "../schema";
import {
  actionWithAuth,
  mutationWithAuth,
  queryWithAuth,
} from "../auth/withAuth";
import { getCourseRegistration } from "../courses";
import { Id } from "../_generated/dataModel";
import { getImageForLecture } from "../lectures";

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
      ...lectureSchema,
    }),
  },
  handler: async ({ db }, { id, row }) => {
    // Verify that the course isn’t changed
    const existing = await db.get(id);
    if (!existing) {
      throw new ConvexError("Lecture not found");
    }

    const oldWeekId = existing.weekId;
    const newWeekId = row.weekId;

    if (newWeekId === null) {
      throw new ConvexError("Invalid data");
    }

    if (oldWeekId === null) {
      throw new ConvexError("Can’t unpublish this lecture");
    }

    // Verify that the lecture stays in the same course
    const oldWeek = await db.get(oldWeekId);
    const newWeek = await db.get(newWeekId);
    if (!oldWeek || !newWeek || newWeek.courseId !== oldWeek.courseId) {
      throw new ConvexError("The course of an exercise cannot be changed");
    }

    return await db.replace(id, row);
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

    await ctx.scheduler.runAfter(0, internal.admin.videoProcessing.default, {
      lectureId: id,
      ...lecture,
    });

    return id;
  },
});

export const setAssistantId = internalMutation({
  args: {
    lectureId: v.id("lectures"),
    assistantId: v.string(),
  },
  handler: async (ctx, { lectureId, assistantId }) => {
    return await ctx.db.patch(lectureId, { assistantId });
  },
});

export const addChunkToVideo = internalMutation({
  args: {
    lectureId: v.id("lectures"),
    chunk: v.string(),
  },
  handler: async (ctx, { lectureId, chunk }) => {
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
    lecture: v.object(lectureSchema),
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
