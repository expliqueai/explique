import {
  ActionCtx,
  DatabaseWriter,
  internalMutation,
} from "./_generated/server";
import { User } from "lucia";
import { Doc, Id } from "./_generated/dataModel";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";

export async function validateDueDate(
  db: DatabaseWriter, // In order to avoid calling this from cached queries
  exercise: Doc<"exercises">,
  user: {
    _id: Id<"users">;
    extraTime?: true;
  },
) {
  const now = Date.now();

  const weekId = exercise.weekId;
  if (weekId === null) {
    throw new ConvexError("The exercise has been deleted");
  }
  const week = await db.get(weekId);
  if (week === null) {
    throw new Error("Week not found");
  }

  const registration = await db
    .query("registrations")
    .withIndex("by_user_and_course", (q) =>
      q.eq("userId", user._id).eq("courseId", week.courseId),
    )
    .first();
  if (registration === null) {
    throw new ConvexError("You are not enrolled in this class.");
  }

  if (
    week.startDate > now &&
    registration.role !== "admin" &&
    registration.role !== "ta"
  ) {
    throw new ConvexError("This exercise hasn’t been released yet.");
  }

  if (now >= week.endDate && !(user.extraTime && now < week.endDateExtraTime)) {
    throw new ConvexError("This exercise due date has passed.");
  }
}

export async function validateDueDateFromAction(
  ctx: Omit<ActionCtx, "auth">,
  exercise: Doc<"exercises">,
  user: User,
) {
  const id = exercise.weekId;
  if (id === null) {
    throw new ConvexError("The exercise has been deleted");
  }

  await ctx.runMutation(internal.weeks.validateDueDateFromActionQuery, {
    id,
    exerciseId: exercise._id,
    userId: user._id,
  });
}

export const validateDueDateFromActionQuery = internalMutation({
  // mutation as to avoid caching

  args: {
    id: v.id("weeks"),
    exerciseId: v.id("exercises"),
    userId: v.id("users"),
  },
  handler: async ({ db }, { exerciseId, userId }) => {
    const exercise = await db.get(exerciseId);
    if (exercise === null) {
      throw new Error("Exercise not found");
    }

    const user = await db.get(userId);
    if (user === null) {
      throw new Error("User not found");
    }

    await validateDueDate(db, exercise, user);
  },
});

export const invalidateCache = internalMutation({
  args: {
    weekId: v.id("weeks"),
  },
  handler: async ({ db }, { weekId }) => {
    await db.patch(weekId, {
      cacheInvalidation: Math.random(),
    });
  },
});
