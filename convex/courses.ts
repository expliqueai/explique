import { ConvexError, v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { ActionCtx, DatabaseReader, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { queryWithAuth } from "./auth/withAuth";

export const getCourseRegistrationQuery = internalQuery({
  args: {
    userId: v.id("users"),
    courseSlug: v.string(),
    role: v.optional(v.literal("admin")),
  },
  handler: async (ctx, { userId, courseSlug, role }) => {
    return await getCourseRegistration(
      ctx.db,
      { user: { _id: userId } },
      courseSlug,
      role,
    );
  },
});

export async function getCourseRegistration(
  ctx: DatabaseReader | Omit<ActionCtx, "auth">,
  session: { user: { _id: Id<"users"> } } | null,
  courseSlug: string,
  role?: "admin",
): Promise<{ course: Doc<"courses">; registration: Doc<"registrations"> }> {
  if (!session) {
    throw new ConvexError("Not logged in");
  }

  if ("runQuery" in ctx) {
    return await ctx.runQuery(internal.courses.getCourseRegistrationQuery, {
      userId: session.user._id,
      role,
      courseSlug,
    });
  }

  const db = ctx;
  const course = await db
    .query("courses")
    .withIndex("by_slug", (q) => q.eq("slug", courseSlug))
    .first();
  if (!course) {
    throw new ConvexError("Course not found");
  }

  const registration = await db
    .query("registrations")
    .withIndex("by_user_and_course", (q) =>
      q.eq("userId", session.user._id).eq("courseId", course._id),
    )
    .first();
  if (!registration) {
    throw new ConvexError("You are not enrolled in this course.");
  }
  if (role === "admin" && registration.role !== "admin") {
    throw new ConvexError("Missing permissions.");
  }

  return { course, registration };
}

export const getRegistration = queryWithAuth({
  args: {
    courseSlug: v.string(),
  },
  handler: async (ctx, { courseSlug }) => {
    if (!ctx.session) return null;

    const { course, registration } = await getCourseRegistration(
      ctx.db,
      ctx.session,
      courseSlug,
    );

    const { name, email } = ctx.session.user;
    return {
      course: {
        name: course.name,
        code: course.code,
      },
      name,
      email,
      isAdmin: registration.role === "admin",
      group:
        registration.role === "admin" && registration.researchGroup
          ? registration.researchGroup.id
          : undefined,
    };
  },
});

export const getMyRegistrations = queryWithAuth({
  args: {},
  handler: async ({ db, session }) => {
    if (!session) return null;

    const registrations = await db
      .query("registrations")
      .withIndex("by_user", (q) => q.eq("userId", session.user._id))
      .collect();

    const results = [];
    for (const registration of registrations) {
      const course = await db.get(registration.courseId);
      if (!course) {
        console.error("Course not found");
        continue;
      }
      results.push({
        code: course.code,
        slug: course.slug,
        name: course.name,
      });
    }

    results.sort((a, b) => a.code.localeCompare(b.code));
    return results;
  },
});

export const getMostRecentRegistration = queryWithAuth({
  args: {},
  handler: async ({ db, session }) => {
    if (!session) return { error: "not_logged_in" };

    const mostRecentRegistration = await db
      .query("registrations")
      .withIndex("by_user", (q) => q.eq("userId", session.user._id))
      .order("desc")
      .first();
    if (!mostRecentRegistration) {
      return { error: "not_enrolled" };
      throw new ConvexError(
        "You are not enrolled in any courses. Please contact your instructor.",
      );
    }

    const course = await db.get(mostRecentRegistration.courseId);
    if (!course) {
      throw new Error("Course not found.");
    }
    return { slug: course.slug };
  },
});
