import { ConvexError, v } from "convex/values";
import { mutationWithAuth, queryWithAuth } from "../auth/withAuth";
import { Id } from "../_generated/dataModel";
import { MutationCtx, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";
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
        .query("weeks")
        .withIndex("by_course_and_start_date", (q) =>
          q.eq("courseId", course._id),
        )
        .collect()
    ).map((week) => ({
      id: week._id,
      name: week.name,
    }));
  },
});

export const getInternal = internalQuery({
  args: {
    id: v.id("weeks"),
  },
  handler: async ({ db }, { id }) => {
    return await db.get(id);
  },
});

export const get = queryWithAuth({
  args: {
    id: v.id("weeks"),
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

async function scheduleWeekChangesInvalidation(
  ctx: Omit<MutationCtx, "auth">,
  weekId: Id<"weeks">,
) {
  const week = await ctx.db.get(weekId);
  if (!week) {
    throw new Error("Week not found");
  }

  for (const date of [week.startDate, week.endDate, week.endDateExtraTime]) {
    ctx.scheduler.runAt(date, internal.weeks.invalidateCache, { weekId });
  }
}

const weekDetails = v.object({
  name: v.string(),
  startDate: v.number(),
  endDate: v.number(),
  softEndDate: v.optional(v.number()),
  endDateExtraTime: v.number(),
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

    validateWeekDetails(weekDetails);

    const weekId = await ctx.db.insert("weeks", {
      ...weekDetails,
      courseId: course._id,
    });
    await scheduleWeekChangesInvalidation(ctx, weekId);
  },
});

export const update = mutationWithAuth({
  args: {
    id: v.id("weeks"),
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

    validateWeekDetails(weekDetails);

    const week = await ctx.db.get(id);
    if (!week || week.courseId !== course._id) {
      throw new ConvexError("Week not found");
    }

    await ctx.db.replace(id, {
      courseId: week.courseId,
      cacheInvalidation: week.cacheInvalidation,

      ...weekDetails,
    });
    await scheduleWeekChangesInvalidation(ctx, id);
  },
});

function validateWeekDetails({
  startDate,
  endDate,
  softEndDate,
}: {
  startDate: number;
  endDate: number;
  softEndDate?: number;
  endDateExtraTime: number;
}) {
  if (startDate >= endDate) {
    throw new ConvexError("The deadline must be after the release date");
  }

  if (softEndDate !== undefined) {
    if (softEndDate >= endDate) {
      throw new ConvexError("The soft deadline must be before the deadline");
    }

    if (softEndDate < startDate) {
      throw new ConvexError("The soft deadline must be after the release date");
    }
  }
}

export const remove = mutationWithAuth({
  args: {
    id: v.id("weeks"),
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

    // Soft delete the exercises
    // @TODO Only query the exercises from this course
    const exercises = await ctx.db
      .query("exercises")
      .withIndex("by_week_id", (q) => q.eq("weekId", id))
      .collect();
    for (const exercise of exercises) {
      await ctx.db.patch(exercise._id, { weekId: null });
    }

    await ctx.db.delete(id);
  },
});
