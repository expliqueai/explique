import { v } from "convex/values";
import { mutationWithAuth, queryWithAuth } from "../auth/withAuth";
import { validateSuperadminSession } from "./util";
import { generateSlug } from "../admin/course";

export const list = queryWithAuth({
  args: {},
  handler: async ({ db, session }) => {
    await validateSuperadminSession(session);
    return (await db.query("courses").collect()).map((course) => ({
      id: course._id,
      code: course.code,
      slug: course.slug,
      name: course.name,
    }));
  },
});

export const add = mutationWithAuth({
  args: {
    name: v.string(),
    code: v.string(),
  },
  handler: async ({ db, session }, { name, code }) => {
    await validateSuperadminSession(session);

    const slug = await generateSlug(db, code, null);

    const courseId = await db.insert("courses", { name, code, slug });
    await db.insert("registrations", {
      courseId,
      role: "admin",
      userId: session!.user._id,
      completedExercises: [],
    });
  },
});
