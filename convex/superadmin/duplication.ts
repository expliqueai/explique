// Tool to duplicate an entire course within the same deployment (without user data)
// Split into action + small mutations to stay under Convex's 16MB read limit.

import { v } from "convex/values"
import { generateSlug } from "../admin/course"
import { internal } from "../_generated/api"
import { Id } from "../_generated/dataModel"
import { internalAction, internalMutation } from "../_generated/server"

// --- Entry point (action, callable from dashboard) ---

export const duplicateCourse = internalAction({
  args: {
    sourceCourseId: v.id("courses"),
    name: v.string(),
    code: v.string(),
  },
  handler: async (ctx, args): Promise<{ courseId: Id<"courses">; slug: string }> => {
    // 1. Create course + copy admin registrations
    const { courseId, slug, weekIds, lectureWeekIds } =
      await ctx.runMutation(
        internal.superadmin.duplication.createCourseAndRegistrations,
        args
      )

    // 2. Duplicate each exercise week (with its exercises + images)
    for (const { sourceWeekId, newWeekId } of weekIds) {
      await ctx.runMutation(
        internal.superadmin.duplication.duplicateExerciseWeek,
        { sourceWeekId, newWeekId }
      )
    }

    // 3. Duplicate each lecture week (with its lectures + images)
    for (const { sourceLectureWeekId, newLectureWeekId } of lectureWeekIds) {
      const lectureMapping = await ctx.runMutation(
        internal.superadmin.duplication.duplicateLectureWeek,
        { sourceLectureWeekId, newLectureWeekId }
      )

      // 4. Duplicate chunks per lecture (heaviest data)
      for (const { sourceLectureId, newLectureId } of lectureMapping) {
        await ctx.runMutation(
          internal.superadmin.duplication.duplicateLectureChunks,
          { sourceLectureId, newLectureId }
        )
      }
    }

    return { courseId, slug }
  },
})

// --- Step 1: create course shell + admin registrations ---

export const createCourseAndRegistrations = internalMutation({
  args: {
    sourceCourseId: v.id("courses"),
    name: v.string(),
    code: v.string(),
  },
  handler: async ({ db }, { sourceCourseId, name, code }) => {
    const sourceCourse = await db.get(sourceCourseId)
    if (!sourceCourse) throw new Error("Source course not found")

    const slug = await generateSlug(db, code, null)
    const courseId = await db.insert("courses", { name, code, slug })

    // Copy admin registrations
    const registrations = await db
      .query("registrations")
      .withIndex("by_course", (q) => q.eq("courseId", sourceCourseId))
      .collect()

    for (const reg of registrations) {
      if (reg.role === "admin") {
        await db.insert("registrations", {
          courseId,
          userId: reg.userId,
          role: reg.role,
          completedExercises: [],
        })
      }
    }

    // Collect week IDs to duplicate
    const weeks = await db
      .query("weeks")
      .withIndex("by_course_and_start_date", (q) =>
        q.eq("courseId", sourceCourseId)
      )
      .collect()

    const weekIds: { sourceWeekId: Id<"weeks">; newWeekId: Id<"weeks"> }[] = []
    for (const week of weeks) {
      const newWeekId = await db.insert("weeks", {
        courseId,
        name: week.name,
        startDate: week.startDate,
        softEndDate: week.softEndDate,
        endDate: week.endDate,
        endDateExtraTime: week.endDateExtraTime,
      })
      weekIds.push({ sourceWeekId: week._id, newWeekId })
    }

    // Collect lecture week IDs to duplicate
    const lectureWeeks = await db
      .query("lectureWeeks")
      .withIndex("by_course_and_start_date", (q) =>
        q.eq("courseId", sourceCourseId)
      )
      .collect()

    const lectureWeekIds: {
      sourceLectureWeekId: Id<"lectureWeeks">
      newLectureWeekId: Id<"lectureWeeks">
    }[] = []
    for (const lw of lectureWeeks) {
      const newLectureWeekId = await db.insert("lectureWeeks", {
        courseId,
        name: lw.name,
        startDate: lw.startDate,
      })
      lectureWeekIds.push({
        sourceLectureWeekId: lw._id,
        newLectureWeekId,
      })
    }

    return { courseId, slug, weekIds, lectureWeekIds }
  },
})

// --- Step 2: duplicate exercises for one week ---

export const duplicateExerciseWeek = internalMutation({
  args: {
    sourceWeekId: v.id("weeks"),
    newWeekId: v.id("weeks"),
  },
  handler: async ({ db }, { sourceWeekId, newWeekId }) => {
    const exercises = await db
      .query("exercises")
      .withIndex("by_week_id", (q) => q.eq("weekId", sourceWeekId))
      .collect()

    for (const exercise of exercises) {
      let newImageId = undefined
      if (exercise.image) {
        const image = await db.get(exercise.image)
        if (image) {
          newImageId = await db.insert("images", {
            storageId: image.storageId,
            thumbnails: image.thumbnails,
            model: image.model,
            size: image.size,
            prompt: image.prompt,
            quality: image.quality,
          })
        }
      }

      const newExerciseId = await db.insert("exercises", {
        name: exercise.name,
        weekId: newWeekId,
        assistantId: exercise.assistantId,
        chatCompletionsApi: exercise.chatCompletionsApi,
        instructions: exercise.instructions,
        model: exercise.model,
        feedback: exercise.feedback,
        text: exercise.text,
        quiz: exercise.quiz,
        firstMessage: exercise.firstMessage,
        controlGroup: exercise.controlGroup,
        completionFunctionDescription: exercise.completionFunctionDescription,
        image: newImageId,
        imagePrompt: exercise.imagePrompt,
      })

      if (newImageId) {
        await db.patch(newImageId, { exerciseId: newExerciseId })
      }
    }
  },
})

// --- Step 3: duplicate lectures for one lecture week (without chunks) ---

export const duplicateLectureWeek = internalMutation({
  args: {
    sourceLectureWeekId: v.id("lectureWeeks"),
    newLectureWeekId: v.id("lectureWeeks"),
  },
  returns: v.array(
    v.object({
      sourceLectureId: v.id("lectures"),
      newLectureId: v.id("lectures"),
    })
  ),
  handler: async ({ db }, { sourceLectureWeekId, newLectureWeekId }) => {
    const lectures = await db
      .query("lectures")
      .withIndex("by_week_id", (q) => q.eq("weekId", sourceLectureWeekId))
      .collect()

    const mapping: {
      sourceLectureId: Id<"lectures">
      newLectureId: Id<"lectures">
    }[] = []

    for (const lecture of lectures) {
      let newImageId = undefined
      if (lecture.image) {
        const image = await db.get(lecture.image)
        if (image) {
          newImageId = await db.insert("images", {
            storageId: image.storageId,
            thumbnails: image.thumbnails,
            model: image.model,
            size: image.size,
            prompt: image.prompt,
            quality: image.quality,
          })
        }
      }

      const newLectureId = await db.insert("lectures", {
        name: lecture.name,
        weekId: newLectureWeekId,
        image: newImageId,
        url: lecture.url,
        firstMessage: lecture.firstMessage,
        status: lecture.status,
        modelName: lecture.modelName,
      })

      if (newImageId) {
        await db.patch(newImageId, { lectureId: newLectureId })
      }

      mapping.push({ sourceLectureId: lecture._id, newLectureId })
    }

    return mapping
  },
})

// --- Step 4: duplicate chunks for one lecture ---

export const duplicateLectureChunks = internalMutation({
  args: {
    sourceLectureId: v.id("lectures"),
    newLectureId: v.id("lectures"),
  },
  handler: async ({ db }, { sourceLectureId, newLectureId }) => {
    const chunks = await db
      .query("lectureChunks")
      .withIndex("by_lecture_id", (q) => q.eq("lectureId", sourceLectureId))
      .collect()

    for (const chunk of chunks) {
      await db.insert("lectureChunks", {
        lectureId: newLectureId,
        content: chunk.content,
        order: chunk.order,
      })
    }
  },
})
