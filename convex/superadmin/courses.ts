import { v } from "convex/values"
import { generateSlug } from "../admin/course"
import { mutationWithAuth, queryWithAuth } from "../auth/withAuth"
import { validateSuperadminSession } from "./util"

export const list = queryWithAuth({
  args: {},
  handler: async ({ db, session }) => {
    validateSuperadminSession(session)
    return (await db.query("courses").collect()).map((course) => ({
      id: course._id,
      code: course.code,
      slug: course.slug,
      name: course.name,
    }))
  },
})

export const register = mutationWithAuth({
  args: {
    courseId: v.id("courses"),
  },
  handler: async ({ db, session }, { courseId }) => {
    validateSuperadminSession(session)

    const existingRegistration = await db
      .query("registrations")
      .withIndex("by_user_and_course", (q) =>
        q.eq("userId", session!.user._id).eq("courseId", courseId)
      )
      .first()

    if (!existingRegistration) {
      await db.insert("registrations", {
        courseId: courseId,
        role: "admin",
        userId: session!.user._id,
        completedExercises: [],
      })
    }
  },
})

export const add = mutationWithAuth({
  args: {
    name: v.string(),
    code: v.string(),
  },
  handler: async ({ db, session }, { name, code }) => {
    await validateSuperadminSession(session)

    const slug = await generateSlug(db, code, null)

    const courseId = await db.insert("courses", { name, code, slug })
    await db.insert("registrations", {
      courseId,
      role: "admin",
      userId: session!.user._id,
      completedExercises: [],
    })
  },
})
