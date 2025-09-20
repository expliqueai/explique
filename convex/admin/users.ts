import { paginationOptsValidator } from "convex/server"
import { ConvexError, v } from "convex/values"
import { Doc, Id } from "../_generated/dataModel"
import { DatabaseReader, DatabaseWriter } from "../_generated/server"
import { generateUserId } from "../auth/lucia"
import { mutationWithAuth, queryWithAuth } from "../auth/withAuth"
import { getCourseRegistration } from "../courses"

export const listExercisesForTable = queryWithAuth({
  args: {
    courseSlug: v.string(),
  },
  handler: async ({ db, session }, { courseSlug }) => {
    const { course } = await getCourseRegistration(
      db,
      session,
      courseSlug,
      "admin"
    )

    const exercises = await db.query("exercises").collect()

    const weeks = (
      await db
        .query("weeks")
        .withIndex("by_course_and_start_date", (q) =>
          q.eq("courseId", course._id)
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
    }))

    return weeks
  },
})

async function formatListElement(
  db: DatabaseReader,
  registration: Doc<"registrations">
) {
  const user = await db.get(registration.userId)
  if (!user) throw new Error("User of registration not found")
  return {
    id: registration.userId,
    email: user.email,
    completedExercises: registration.completedExercises,
    role: registration.role,
  }
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
      "admin"
    )

    const registrations = await db
      .query("registrations")
      .withIndex("by_course_and_role", (q) => q.eq("courseId", course._id))
      .order("desc")
      .paginate(paginationOpts)

    return {
      ...registrations,
      page: await Promise.all(
        registrations.page.map((registration) =>
          formatListElement(db, registration)
        )
      ),
    }
  },
})

async function findOrCreateUserByEmail(
  db: DatabaseWriter,
  email: string
): Promise<Id<"users">> {
  const user = await db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", email))
    .first()

  const normalizedEmail = email.trim().toLowerCase()
  return user
    ? user._id
    : await db.insert("users", {
        id: generateUserId(),
        email: normalizedEmail,
        name: null,
      })
}

async function getUserCourseData(
  db: DatabaseReader,
  userId: Id<"users">,
  courseId: Id<"courses">
) {
  // Get all exercises for this course
  const weeks = await db
    .query("weeks")
    .withIndex("by_course_and_start_date", (q) => q.eq("courseId", courseId))
    .collect()

  const exerciseIds: Id<"exercises">[] = []
  for (const week of weeks) {
    const exercises = await db
      .query("exercises")
      .withIndex("by_week_id", (q) => q.eq("weekId", week._id))
      .collect()

    exerciseIds.push(...exercises.map((e) => e._id))
  }

  // Find attempts for these exercises by this user
  const attempts = []
  for (const exerciseId of exerciseIds) {
    const attempt = await db
      .query("attempts")
      .withIndex("by_key", (q) =>
        q.eq("userId", userId).eq("exerciseId", exerciseId)
      )
      .first()

    if (attempt) {
      attempts.push(attempt)
    }
  }

  // Get completed exercises from attempts
  const completedExercises = attempts
    .filter(
      (attempt) =>
        attempt.status === "exerciseCompleted" ||
        attempt.status === "quizCompleted"
    )
    .map((attempt) => attempt.exerciseId)

  return {
    hasData: attempts.length > 0,
    completedExercises: [...new Set(completedExercises)], // Remove duplicates
    totalAttempts: attempts.length,
  }
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
      })
    ),
  },
  handler: async ({ db, session }, { courseSlug, users }) => {
    const { course } = await getCourseRegistration(
      db,
      session,
      courseSlug,
      "admin"
    )

    const userIds = []
    if ("emails" in users) {
      for (const email of users.emails) {
        userIds.push(await findOrCreateUserByEmail(db, email))
      }
    }

    let added = 0
    let ignored = 0
    let restored = 0

    for (const userId of userIds) {
      const existing = await db
        .query("registrations")
        .withIndex("by_user_and_course", (q) =>
          q.eq("userId", userId).eq("courseId", course._id)
        )
        .first()

      if (!existing) {
        // Check if user has existing course data
        const courseData = await getUserCourseData(db, userId, course._id)

        await db.insert("registrations", {
          userId,
          courseId: course._id,
          role: null,
          completedExercises: courseData.hasData
            ? courseData.completedExercises
            : [],
        })

        if (courseData.hasData) {
          restored++
        } else {
          added++
        }
      } else {
        ignored++
      }
    }

    return { added, ignored, restored }
  },
})

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
      "admin"
    )

    const registration = await db
      .query("registrations")
      .withIndex("by_user_and_course", (q) =>
        q.eq("userId", userId).eq("courseId", course._id)
      )
      .first()
    if (!registration) {
      throw new ConvexError("This user is not enrolled in this course.")
    }

    if (registration.role === role) {
      return
    }

    if (userId === session?.user._id) {
      throw new ConvexError("You cannot remove your own admin privileges.")
    }

    await db.patch(registration._id, {
      role,
    })
  },
})

export const unregisterFromCourse = mutationWithAuth({
  args: {
    courseSlug: v.string(),
    userId: v.id("users"),
  },
  handler: async ({ db, session }, { courseSlug, userId }) => {
    const { course } = await getCourseRegistration(
      db,
      session,
      courseSlug,
      "admin"
    )

    const registration = await db
      .query("registrations")
      .withIndex("by_user_and_course", (q) =>
        q.eq("userId", userId).eq("courseId", course._id)
      )
      .first()

    if (!registration) {
      throw new ConvexError("This user is not enrolled in this course.")
    }

    if (userId === session?.user._id) {
      throw new ConvexError("You cannot remove yourself from the course.")
    }

    await db.delete(registration._id)
  },
})
