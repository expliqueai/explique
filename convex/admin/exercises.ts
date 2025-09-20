import { ConvexError, v } from "convex/values"
import { internal } from "../_generated/api"
import { Id } from "../_generated/dataModel"
import {
  ActionCtx,
  internalAction,
  internalMutation,
  internalQuery,
} from "../_generated/server"
import {
  actionWithAuth,
  mutationWithAuth,
  queryWithAuth,
} from "../auth/withAuth"
import { getCourseRegistration } from "../courses"
import { getImageForExercise } from "../exercises"
import { exerciseAdminSchema } from "../schema"

export const get = queryWithAuth({
  args: {
    id: v.id("exercises"),
    courseSlug: v.string(),
  },
  handler: async ({ db, session }, { id, courseSlug }) => {
    await getCourseRegistration(db, session, courseSlug, "admin")

    const exercise = await db.get(id)
    if (!exercise) {
      throw new ConvexError("Exercise not found")
    }

    const { weekId } = exercise
    if (weekId === null) {
      throw new ConvexError("The exercise has been deleted")
    }

    return { ...exercise, weekId }
  },
})

export const list = queryWithAuth({
  args: {
    courseSlug: v.string(),
  },
  handler: async ({ db, session, storage }, { courseSlug }) => {
    const { course } = await getCourseRegistration(
      db,
      session,
      courseSlug,
      "admin"
    )

    const weeks = await db
      .query("weeks")
      .withIndex("by_course_and_start_date", (q) =>
        q.eq("courseId", course._id)
      )
      .order("desc")
      .collect()

    const exercises = await db.query("exercises").collect();
    const problems = await db.query("problems").collect();

    const result = []
    for (const week of weeks) {
      const resultExercises = await Promise.all(
        exercises
          .filter((ex) => ex.weekId === week._id)
          .map(async (ex) => ({
            type: "exercise",
            id: ex._id,
            name: ex.name,
            image: await getImageForExercise(db, storage, ex),
          }))
      );

      const resultProblems = problems
        .filter((p) => p.weekId === week._id)
        .map((p) => ({
          type: "problem" as const,
          id: p._id,
          number: p.name,
          mandatory: p.mandatory ?? false,
          instructions: p.instructions,
        }));

      result.push({
        ...week,
        items: [...resultExercises, ...resultProblems],
      });
    }

    return result
  },
})

export const insertRow = internalMutation({
  args: exerciseAdminSchema,
  handler: async ({ db }, row) => {
    return await db.insert("exercises", row)
  },
})

export const updateRow = internalMutation({
  args: {
    id: v.id("exercises"),
    row: v.object(exerciseAdminSchema),
  },
  handler: async ({ db }, { id, row }) => {
    // Verify that the course isn’t changed
    const existing = await db.get(id)
    if (!existing) {
      throw new ConvexError("Exercise not found")
    }

    const oldWeekId = existing.weekId
    const newWeekId = row.weekId

    if (newWeekId === null) {
      throw new ConvexError("Invalid data")
    }

    if (oldWeekId === null) {
      throw new ConvexError("Can’t unpublish this exercise")
    }

    // Verify that the exercise stays in the same course
    const oldWeek = await db.get(oldWeekId)
    const newWeek = await db.get(newWeekId)
    if (!oldWeek || !newWeek || newWeek.courseId !== oldWeek.courseId) {
      throw new ConvexError("The course of an exercise cannot be changed")
    }

    return await db.replace(id, row)
  },
})

export const createInternal = internalAction({
  args: exerciseAdminSchema,
  handler: async ({ runMutation }, row) => {
    validateQuiz(row.quiz)
    // Model validation removed - gemini-2.0-flash will be used as default

    await runMutation(internal.admin.exercises.insertRow, {
      ...{
        ...row,
        sessionId: undefined,
      },
    })
  },
})

export const create = actionWithAuth({
  args: {
    courseSlug: v.string(),
    exercise: v.object(exerciseAdminSchema),
  },
  handler: async (ctx, { courseSlug, exercise }) => {
    const { course } = await getCourseRegistration(
      ctx,
      ctx.session,
      courseSlug,
      "admin"
    )

    const { weekId } = exercise
    if (weekId === null) {
      throw new ConvexError("Invalid week ID")
    }

    // Validate the week ID
    const week = await ctx.runQuery(internal.admin.weeks.getInternal, {
      id: weekId,
    })
    if (!week || week.courseId !== course._id) {
      throw new ConvexError("Invalid week")
    }

    await ctx.runAction(internal.admin.exercises.createInternal, exercise)
  },
})

export const courseSlugOfExercise = internalQuery({
  args: {
    id: v.id("exercises"),
  },
  handler: async (ctx, args) => {
    const exercise = await ctx.db.get(args.id)
    if (!exercise) {
      throw new ConvexError("Exercise not found")
    }

    const weekId = exercise.weekId
    if (weekId === null) {
      throw new ConvexError("This exercise has been deleted")
    }
    const week = await ctx.db.get(weekId)
    if (!week) {
      throw new ConvexError("Week not found")
    }

    const course = await ctx.db.get(week.courseId)
    if (!course) {
      throw new ConvexError("Course not found")
    }

    return course.slug
  },
})

export async function validateExerciseInCourse(
  ctx: Omit<ActionCtx, "auth">,
  courseSlug: string,
  id: Id<"exercises">
) {
  const exerciseCourseSlug = await ctx.runQuery(
    internal.admin.exercises.courseSlugOfExercise,
    { id }
  )
  if (exerciseCourseSlug !== courseSlug) {
    throw new ConvexError("Exercise not found")
  }
}

export const update = actionWithAuth({
  args: {
    id: v.id("exercises"),
    exercise: v.object(exerciseAdminSchema),
    courseSlug: v.string(),
  },
  handler: async (ctx, { id, exercise, courseSlug }) => {
    await getCourseRegistration(ctx, ctx.session, courseSlug, "admin")
    await validateExerciseInCourse(ctx, courseSlug, id)

    validateQuiz(exercise.quiz)
    // Model validation removed - gemini-2.0-flash will be used as default

    await ctx.runMutation(internal.admin.exercises.updateRow, {
      id,
      row: exercise,
    })
  },
})

type Quiz = null | {
  batches: {
    questions: {
      answers: {
        text: string
        correct: boolean
      }[]
      question: string
    }[]
  }[]
}

function validateQuiz(quiz: Quiz) {
  if (quiz === null) return
  for (const { questions } of quiz.batches) {
    for (const question of questions) {
      if (question.answers.length < 2) {
        throw new ConvexError("Each question must have at least 2 answers")
      }
      if (question.answers.filter((a) => a.correct).length !== 1) {
        throw new ConvexError(
          "Each question must have exactly 1 correct answer"
        )
      }
      const answers = new Set(question.answers.map((a) => a.text))
      if (answers.size !== question.answers.length) {
        throw new ConvexError(
          `Duplicated answer to question “${question.question}”`
        )
      }
    }
  }
}

export const softDelete = mutationWithAuth({
  args: {
    id: v.id("exercises"),
    courseSlug: v.string(),
  },
  handler: async (ctx, { id, courseSlug }) => {
    const { course } = await getCourseRegistration(
      ctx.db,
      ctx.session,
      courseSlug,
      "admin"
    )

    const exercise = await ctx.db.get(id)
    if (!exercise) {
      throw new ConvexError("Exercise not found")
    }

    const weekId = exercise.weekId
    if (weekId === null) {
      throw new ConvexError("The exercise has already been deleted")
    }

    const week = await ctx.db.get(weekId)
    if (!week) {
      throw new Error("Week not found")
    }
    if (week.courseId !== course._id) {
      throw new ConvexError("Exercise not found")
    }

    await ctx.db.patch(exercise._id, { weekId: null })
  },
})

export const duplicate = mutationWithAuth({
  args: {
    courseSlug: v.string(),
    id: v.id("exercises"),

    weekId: v.id("weeks"),
    courseId: v.id("courses"),
  },
  handler: async (ctx, { courseSlug, id, weekId }) => {
    const { course } = await getCourseRegistration(
      ctx.db,
      ctx.session,
      courseSlug,
      "admin"
    )

    const exercise = await ctx.db.get(id)
    if (!exercise) {
      throw new ConvexError("Exercise not found")
    }

    // Do I have admin rights over this exercise?
    const oldWeekId = exercise.weekId
    if (oldWeekId === null) {
      throw new ConvexError("The exercise has been deleted")
    }
    const oldWeek = await ctx.db.get(oldWeekId)
    if (!oldWeek) {
      throw new Error("Week not found")
    }
    if (oldWeek.courseId !== course._id) {
      throw new ConvexError("Exercise not found")
    }

    // Am I an admin of the course?
    const newWeek = await ctx.db.get(weekId)
    if (!newWeek) {
      throw new ConvexError("Week not found")
    }

    const registration = await ctx.db
      .query("registrations")
      .withIndex("by_user_and_course", (q) =>
        q.eq("userId", ctx.session!.user._id).eq("courseId", newWeek.courseId)
      )
      .filter((q) => q.eq(q.field("role"), "admin"))
      .first()
    if (!registration) {
      throw new ConvexError("You are not an admin of the new course")
    }

    const newExerciseId = await ctx.db.insert("exercises", {
      ...{ ...exercise, _id: undefined, _creationTime: undefined },
      weekId,
    })

    if (exercise.image) {
      const oldImage = await ctx.db.get(exercise.image)
      if (!oldImage) {
        throw new Error("Image not found")
      }

      const newImageId = await ctx.db.insert("images", {
        ...{
          ...oldImage,
          _id: undefined,
          _creationTime: undefined,
          exerciseId: newExerciseId,
        },
      })

      await ctx.db.patch(newExerciseId, { image: newImageId })
    }
  },
})
