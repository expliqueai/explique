import { ConvexError, v } from "convex/values";
import { getCourseRegistration } from "../courses";
import { mutationWithAuth, queryWithAuth } from "../auth/withAuth";
import { Doc, Id } from "../_generated/dataModel";
import { DatabaseReader, DatabaseWriter } from "../_generated/server";
import { generateUserId } from "../auth/lucia";
import { paginationOptsValidator } from "convex/server";

export const listExercisesForTable = queryWithAuth({
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

    return weeks;
  },
});

async function formatListElement(
  db: DatabaseReader,
  registration: Doc<"registrations">,
) {
  const user = await db.get(registration.userId);
  if (!user) throw new Error("User of registration not found");
  return {
    id: registration.userId,
    email: user.email,
    completedExercises: registration.completedExercises,
    role: registration.role,
  };
}

export const list = queryWithAuth({
  args: {
    courseSlug: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async ({ db, session }, { courseSlug, paginationOpts }) => {
    const { course } = await getCourseRegistration(
      db,
      session,
      courseSlug,
      "admin",
    );

    const registrations = await db
      .query("registrations")
      .withIndex("by_course_and_role", (q) => q.eq("courseId", course._id))
      .order("desc")
      .paginate(paginationOpts);

    return {
      ...registrations,
      page: await Promise.all(
        registrations.page.map((registration) =>
          formatListElement(db, registration),
        ),
      ),
    };
  },
});

async function findOrCreateUserByEmail(
  db: DatabaseWriter,
  email: string,
): Promise<Id<"users">> {
  const user = await db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", email))
    .first();
  return user
    ? user._id
    : await db.insert("users", { id: generateUserId(), email, name: null });
}

export const register = mutationWithAuth({
  args: {
    courseSlug: v.string(),
    users: v.union(
      v.object({
        emails: v.array(v.string()),
      }),
      v.object({
        identifiers: v.array(v.string()),
      }),
    ),
  },
  handler: async ({ db, session }, { courseSlug, users }) => {
    const { course } = await getCourseRegistration(
      db,
      session,
      courseSlug,
      "admin",
    );

    const userIds = [];

    if ("emails" in users) {
      for (const email of users.emails) {
        userIds.push(await findOrCreateUserByEmail(db, email));
      }
    }

    let added = 0;
    let ignored = 0;

    for (const userId of userIds) {
      const existing = await db
        .query("registrations")
        .withIndex("by_user_and_course", (q) =>
          q.eq("userId", userId).eq("courseId", course._id),
        )
        .first();
      if (!existing) {
        await db.insert("registrations", {
          userId,
          courseId: course._id,
          role: null,
          completedExercises: [],
        });
        added++;
      } else {
        ignored++;
      }
    }

    return { added, ignored };
  },
});

export const setRole = mutationWithAuth({
  args: {
    courseSlug: v.string(),
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("ta"), v.null()),
  },
  handler: async ({ db, session }, { courseSlug, userId, role }) => {
    const { course } = await getCourseRegistration(
      db,
      session,
      courseSlug,
      "admin",
    );

    const registration = await db
      .query("registrations")
      .withIndex("by_user_and_course", (q) =>
        q.eq("userId", userId).eq("courseId", course._id),
      )
      .first();
    if (!registration) {
      throw new ConvexError("This user is not enrolled in this course.");
    }

    if (registration.role === role) {
      return;
    }

    if (userId === session?.user._id) {
      throw new ConvexError("You cannot remove your own admin privileges.");
    }

    await db.patch(registration._id, {
      role,
    });
  },
});
