import { ConvexError, v } from "convex/values";
import {
  ActionCtx,
  internalAction,
  internalMutation,
  internalQuery,
} from "../_generated/server";
import OpenAI from "openai";
import { internal } from "../_generated/api";
import { exerciseAdminSchema } from "../schema";
import { actionWithAuth, queryWithAuth } from "../auth/withAuth";
import { COMPLETION_VALID_MODELS } from "../chat";
import { getCourseRegistration } from "../courses";
import { Id } from "../_generated/dataModel";
import { getImageForExercise } from "../exercises";

export const get = queryWithAuth({
  args: {
    id: v.id("exercises"),
    courseSlug: v.string(),
  },
  handler: async ({ db, session }, { id, courseSlug }) => {
    await getCourseRegistration(db, session, courseSlug, "admin");

    const exercise = await db.get(id);
    if (!exercise) {
      return null;
    }

    return exercise;
  },
});

export const list = queryWithAuth({
  args: {
    courseSlug: v.string(),
  },
  handler: async ({ db, session, storage }, { courseSlug }) => {
    const { course } = await getCourseRegistration(
      db,
      session,
      courseSlug,
      "admin",
    );

    const weeks = await db
      .query("weeks")
      .withIndex("by_course_and_start_date", (q) =>
        q.eq("courseId", course._id),
      )
      .order("desc")
      .collect();
    const exercises = await db.query("exercises").collect();

    const result = [];
    for (const week of weeks) {
      const resultExercises = [];
      for (const exercise of exercises) {
        if (exercise.weekId === week._id) {
          resultExercises.push({
            id: exercise._id,
            name: exercise.name,
            image: await getImageForExercise(db, storage, exercise),
          });
        }
      }

      result.push({
        ...week,
        exercises: resultExercises,
      });
    }

    return result;
  },
});

export const insertRow = internalMutation({
  args: { ...exerciseAdminSchema, assistantId: v.string() },
  handler: async ({ db }, row) => {
    return await db.insert("exercises", row);
  },
});

export const updateRow = internalMutation({
  args: {
    id: v.id("exercises"),
    row: v.object({
      ...exerciseAdminSchema,
      assistantId: v.string(),
    }),
  },
  handler: async ({ db }, { id, row }) => {
    // Verify that the course isn’t changed
    const existing = await db.get(id);
    if (!existing) {
      throw new ConvexError("Exercise not found");
    }

    // Verify that the exercise stays in the same course
    const oldWeek = await db.get(existing.weekId);
    const newWeek = await db.get(row.weekId);
    if (!oldWeek || !newWeek || newWeek.courseId !== oldWeek.courseId) {
      throw new ConvexError("The course of an exercise cannot be changed");
    }

    return await db.replace(id, row);
  },
});

async function createAssistant(
  instructions: string,
  model: string,
  completionFunctionDescription: string,
) {
  const openai = new OpenAI();
  return await openai.beta.assistants.create({
    instructions,
    model: model,
    tools: [
      {
        type: "function",
        function: {
          name: "markComplete",
          description: completionFunctionDescription,
          parameters: {},
        },
      },
    ],
  });
}

export const createInternal = internalAction({
  args: exerciseAdminSchema,
  handler: async ({ runMutation }, row) => {
    validateQuiz(row.quiz);
    if (
      row.chatCompletionsApi &&
      !COMPLETION_VALID_MODELS.includes(row.model as any)
    ) {
      throw new ConvexError(
        `The model ${row.model} is not supported by the Chat Completions API.`,
      );
    }

    const assistant = await createAssistant(
      row.instructions,
      row.model,
      row.completionFunctionDescription,
    );

    await runMutation(internal.admin.exercises.insertRow, {
      ...{ ...row, sessionId: undefined },
      assistantId: assistant.id,
    });
  },
});

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
      "admin",
    );

    // Validate the week ID
    const week = await ctx.runQuery(internal.admin.weeks.getInternal, {
      id: exercise.weekId,
    });
    if (!week || week.courseId !== course._id) {
      throw new ConvexError("Invalid week");
    }

    await ctx.runAction(internal.admin.exercises.createInternal, exercise);
  },
});

export const courseSlugOfExercise = internalQuery({
  args: {
    id: v.id("exercises"),
  },
  handler: async (ctx, args) => {
    const exercise = await ctx.db.get(args.id);
    if (!exercise) {
      throw new ConvexError("Exercise not found");
    }

    const week = await ctx.db.get(exercise.weekId);
    if (!week) {
      throw new ConvexError("Week not found");
    }

    const course = await ctx.db.get(week.courseId);
    if (!course) {
      throw new ConvexError("Course not found");
    }

    return course.slug;
  },
});

export async function validateExerciseInCourse(
  ctx: Omit<ActionCtx, "auth">,
  courseSlug: string,
  id: Id<"exercises">,
) {
  const exerciseCourseSlug = await ctx.runQuery(
    internal.admin.exercises.courseSlugOfExercise,
    { id },
  );
  if (exerciseCourseSlug !== courseSlug) {
    throw new ConvexError("Exercise not found");
  }
}

export const update = actionWithAuth({
  args: {
    id: v.id("exercises"),
    exercise: v.object(exerciseAdminSchema),
    courseSlug: v.string(),
  },
  handler: async (ctx, { id, exercise, courseSlug }) => {
    await getCourseRegistration(ctx, ctx.session, courseSlug, "admin");
    await validateExerciseInCourse(ctx, courseSlug, id);

    validateQuiz(exercise.quiz);

    // Verify that this exercise can be edited by the user

    if (
      exercise.chatCompletionsApi &&
      !COMPLETION_VALID_MODELS.includes(exercise.model as any)
    ) {
      throw new ConvexError(
        `The model ${exercise.model} is not supported by the Chat Completions API.`,
      );
    }

    const assistant = await createAssistant(
      exercise.instructions,
      exercise.model,
      exercise.completionFunctionDescription,
    );

    await ctx.runMutation(internal.admin.exercises.updateRow, {
      id,
      row: {
        ...exercise,
        assistantId: assistant.id,
      },
    });
  },
});

type Quiz = null | {
  batches: {
    questions: {
      answers: {
        text: string;
        correct: boolean;
      }[];
      question: string;
    }[];
  }[];
};

function validateQuiz(quiz: Quiz) {
  if (quiz === null) return;
  for (const { questions } of quiz.batches) {
    for (const question of questions) {
      if (question.answers.length < 2) {
        throw new ConvexError("Each question must have at least 2 answers");
      }
      if (question.answers.filter((a) => a.correct).length !== 1) {
        throw new ConvexError(
          "Each question must have exactly 1 correct answer",
        );
      }
      const answers = new Set(question.answers.map((a) => a.text));
      if (answers.size !== question.answers.length) {
        throw new ConvexError(
          `Duplicated answer to question “${question.question}”`,
        );
      }
    }
  }
}
