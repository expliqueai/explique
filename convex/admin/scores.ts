import { v } from "convex/values";
import { queryWithAuth } from "../auth/withAuth";
import { getCourseRegistration } from "../courses";

export default queryWithAuth({
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

    const exercises = await db.query("exercises").collect();
    const weeks = (
      await db
        .query("weeks")
        .withIndex("by_course_and_start_date", (q) =>
          q.eq("courseId", course._id),
        )
        .collect()
    ).map((week) => ({
      id: week._id,
      name: week.name,
      exercises: exercises
        .filter((e) => e.weekId === week._id)
        .map((e) => ({
          id: e._id,
          name: e.name,
        })),
    }));

    const registrations = await db
      .query("registrations")
      .withIndex("by_course", (q) => q.eq("courseId", course._id))
      .collect();

    const users = await Promise.all(
      registrations.map(async (registration) => {
        const user = await db.get(registration.userId);
        if (!user) throw new Error("User of registration not found");
        return {
          id: registration.userId,
          email: user.email,
          identifier: user.identifier,
          completedExercises: registration.completedExercises,
          role: registration.role,
        };
      }),
    );

    return {
      weeks,
      users,
    };
  },
});
