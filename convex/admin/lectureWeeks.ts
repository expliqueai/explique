import { ConvexError, v } from "convex/values";
import { mutationWithAuth, queryWithAuth } from "../auth/withAuth";
import { internalQuery } from "../_generated/server";
import { getCourseRegistration } from "../courses";

export const list = queryWithAuth({
  args: {
    courseSlug: v.string(),
  },
  handler: async ({ db, session }, { courseSlug }) => {
    const { course } = await getCourseRegistration(
      db,
      session,
      courseSlug,
      "admin",
    );

    return (
      await db
        .query("lectureWeeks")
        .withIndex("by_course_and_start_date", (q) =>
          q.eq("courseId", course._id),
        )
        .collect()
    ).map((week) => ({
      id: week._id,
      name: week.name,
      startDate: week.startDate,
    }));
  },
});

export const getInternal = internalQuery({
  args: {
    id: v.id("lectureWeeks"),
  },
  handler: async ({ db }, { id }) => {
    return await db.get(id);
  },
});

export const get = queryWithAuth({
  args: {
    id: v.id("lectureWeeks"),
    courseSlug: v.string(),
  },
  handler: async ({ db, session }, { id, courseSlug }) => {
    const { course } = await getCourseRegistration(
      db,
      session,
      courseSlug,
      "admin",
    );

    const week = await db.get(id);
    if (!week) {
      return null;
    }

    if (week.courseId !== course._id) {
      return null;
    }

    return week;
  },
});

const weekDetails = v.object({
  name: v.string(),
  startDate: v.number(),
});

export const create = mutationWithAuth({
  args: { weekDetails, courseSlug: v.string() },
  handler: async (ctx, { courseSlug, weekDetails }) => {
    const { course } = await getCourseRegistration(
      ctx.db,
      ctx.session,
      courseSlug,
      "admin",
    );

    const weekId = await ctx.db.insert("lectureWeeks", {
      ...weekDetails,
      courseId: course._id,
    });

    return weekId;
  },
});

export const update = mutationWithAuth({
  args: {
    id: v.id("lectureWeeks"),
    weekDetails,
    courseSlug: v.string(),
  },
  handler: async (ctx, { id, courseSlug, weekDetails }) => {
    const { course } = await getCourseRegistration(
      ctx.db,
      ctx.session,
      courseSlug,
      "admin",
    );

    const week = await ctx.db.get(id);
    if (!week || week.courseId !== course._id) {
      throw new ConvexError("Week not found");
    }

    await ctx.db.patch(id, {
      ...weekDetails,
    });
  },
});

export const remove = mutationWithAuth({
  args: {
    id: v.id("lectureWeeks"),
    courseSlug: v.string(),
  },
  handler: async (ctx, { id, courseSlug }) => {
    const { course } = await getCourseRegistration(
      ctx.db,
      ctx.session,
      courseSlug,
      "admin",
    );

    const week = await ctx.db.get(id);
    if (!week || week.courseId !== course._id) {
      throw new ConvexError("Week not found");
    }

    // Soft delete the lectures
    const lectures = await ctx.db
      .query("lectures")
      .withIndex("by_week_id", (q) => q.eq("weekId", id))
      .collect();
    for (const lecture of lectures) {
      await ctx.db.patch(lecture._id, { weekId: null });
    }

    await ctx.db.delete(id);
  },
});
