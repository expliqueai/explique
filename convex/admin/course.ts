import { ConvexError, v } from "convex/values";
import { mutationWithAuth, queryWithAuth } from "../auth/withAuth";
import { getCourseRegistration } from "../courses";
import slugify from "@sindresorhus/slugify";
import { DatabaseReader } from "../_generated/server";
import { Id } from "../_generated/dataModel";

export const get = queryWithAuth({
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

    return {
      name: course.name,
      code: course.code,
    };
  },
});

export const edit = mutationWithAuth({
  args: {
    courseSlug: v.string(),
    name: v.string(),
    code: v.string(),
  },
  handler: async ({ db, session }, { courseSlug, name, code }) => {
    const { course } = await getCourseRegistration(
      db,
      session,
      courseSlug,
      "admin",
    );

    const slug = await generateSlug(db, code, course._id);
    await db.patch(course._id, { name, code, slug });
    return { slug };
  },
});

export async function generateSlug(
  db: DatabaseReader,
  code: string,
  existingCourseId: Id<"courses"> | null,
) {
  if (!/^[A-Za-z0-9\(\)-_]+$/.test(code)) {
    throw new ConvexError("Invalid course code.");
  }

  const slug = slugify(code, {
    separator: "",
  });

  // Verify that the name is not already used by another course
  let existingCourseQuery = db
    .query("courses")
    .withIndex("by_slug", (q) => q.eq("slug", slug));
  if (existingCourseId) {
    existingCourseQuery = existingCourseQuery.filter((q) =>
      q.not(q.eq(q.field("_id"), existingCourseId)),
    );
  }
  const existingCourse = await existingCourseQuery.first();
  if (existingCourse) {
    throw new ConvexError(
      "This course code is already used by another course.",
    );
  }

  return slug;
}
