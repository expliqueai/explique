import { ConvexError, v } from "convex/values";
import {
  DatabaseReader,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import OpenAI from "openai";
import { internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";
import {
  actionWithAuth,
  mutationWithAuth,
  queryWithAuth,
} from "./auth/withAuth";
import { validateDueDate, validateDueDateFromAction } from "./weeks";
import { Question, shownQuestions } from "./quiz";
import { Chance } from "chance";

export const get = queryWithAuth({
  args: {
    id: v.id("attempts"),
  },
  handler: async ({ db, session }, { id }) => {
    if (!session) {
      throw new ConvexError("Not logged in");
    }

    const attempt = await db.get(id);
    if (attempt === null) throw new ConvexError("Unknown attempt");

    const exercise = await db.get(attempt.exerciseId);
    if (exercise === null) throw new Error("No exercise");

    const weekId = exercise.weekId;
    if (weekId === null) {
      throw new ConvexError("This exercise has been deleted");
    }
    const week = await db.get(weekId);
    if (week === null) throw new Error("No week");

    const course = await db.get(week.courseId);
    if (course === null) throw new Error("No course");

    const registration = await db
      .query("registrations")
      .withIndex("by_user_and_course", (q) =>
        q.eq("userId", session.user._id).eq("courseId", course._id),
      )
      .first();
    if (!registration) {
      throw new ConvexError("You are not enrolled in the course.");
    }

    const userId = session.user._id;
    if (attempt.userId !== userId && registration.role !== "admin") {
      throw new Error("Attempt from someone else");
    }

    const now = Date.now();
    if (
      week.startDate > now &&
      registration.role !== "admin" &&
      registration.role !== "ta"
    ) {
      throw new ConvexError("This exercise hasn’t been released yet.");
    }

    const isDue =
      now >= week.endDate &&
      !(session.user.extraTime && now < week.endDateExtraTime);
    const isSolutionShown = now >= week.endDateExtraTime;

    return {
      course: {
        slug: course.slug,
      },

      exercise: {
        id: exercise._id,
        name: exercise.name,
      },

      isAdmin: registration.role === "admin",

      ...(isSolutionShown
        ? {
            steps: Promise.all(
              exercise.steps.map((stepId) =>
                getStepData(
                  db,
                  stepId,
                  userId,
                  exercise,
                  attempt,
                  isSolutionShown,
                ),
              ),
            ),
          }
        : {
            currentStep: await getStepData(
              db,
              attempt.currentStepId,
              userId,
              exercise,
              attempt,
              isSolutionShown,
            ),
          }),

      isDue,
    };
  },
});

export async function getStepData(
  db: DatabaseReader,
  stepId: Id<"steps">,
  userId: Id<"users">,
  exercise: Doc<"exercises">,
  attempt: Doc<"attempts">,
  isSolutionShown: boolean,
) {
  const step = await db.get(stepId);
  if (step === null) throw new Error(`Step ${stepId} not found`);

  const stepIndex = exercise.steps.indexOf(stepId);
  if (stepIndex === -1) throw new Error("Step not in exercise");

  const currentExerciseIndex = exercise.steps.indexOf(attempt.currentStepId);
  if (currentExerciseIndex === -1) {
    throw new Error("Current step not in exercise");
  }

  const completed = attempt.completed ? true : stepIndex > currentExerciseIndex;

  switch (step.variant) {
    case "explain":
      return {
        variant: "explain" as const,
        completed,
      };
    case "quiz":
      const lastQuizSubmission = await db
        .query("quizSubmissions")
        .withIndex("by_step_id", (q) => q.eq("stepId", step._id))
        .order("desc")
        .first();
      return {
        variant: "quiz" as const,
        completed,
        quiz: shownQuestions(step, userId, stepId).map(
          (question, questionIndex) =>
            toUserVisibleQuestion(
              question,
              isSolutionShown,
              userId,
              stepId,
              questionIndex,
            ),
        ),
        lastQuizSubmission: lastQuizSubmission
          ? {
              answers: lastQuizSubmission.answers,
              timestamp: lastQuizSubmission._creationTime,
            }
          : null,
      };
    case "read":
      return {
        variant: "read" as const,
        completed,
        text: step.text,
      };
    default:
      throw new Error("Unknown step variant");
  }
}

function toUserVisibleQuestion(
  question: Question,
  isSolutionShown: boolean,
  userId: Id<"users">,
  stepId: Id<"steps">,
  questionIndex: number,
): {
  question: string;
  answers: string[];
  correctAnswer: string | null;
} {
  const chanceAnswersOrder = new Chance(
    `${stepId} ${userId} ${questionIndex} answers order`,
  );

  return {
    question: question.question,
    answers: chanceAnswersOrder.shuffle(
      question.answers.map((answer) => answer.text),
    ),
    correctAnswer: isSolutionShown
      ? question.answers.find((a) => a.correct)!.text
      : null,
  };
}

/*export const insert = internalMutation({
  args: {
    exerciseId: v.id("exercises"),
    userId: v.id("users"),
    threadId: v.union(v.string(), v.null()),
  },
  handler: async ({ db }, { exerciseId, userId, threadId }) => {
    const attemptId = await db.insert("attempts", {
      status: "exercise",
      exerciseId,
      userId,
      threadId,
    });

    await db.insert("logs", {
      type: "attemptStarted",
      userId,
      attemptId,
      exerciseId,
    });

    return attemptId;
  },
});*/

/*export const start = actionWithAuth({
  args: {
    exerciseId: v.id("exercises"),
  },
  handler: async (ctx, { exerciseId }) => {
    if (!ctx.session) throw new ConvexError("Not logged in");
    const userId = ctx.session.user._id;

    const exercise = await ctx.runQuery(internal.exercises.getRow, {
      id: exerciseId,
    });
    if (exercise === null) throw new ConvexError("Unknown exercise");

    await validateDueDateFromAction(ctx, exercise, ctx.session.user);

    const isUsingExplainVariant = await ctx.runQuery(
      internal.attempts.isUsingExplainVariant,
      {
        exerciseId,
        userId,
      },
    );
    let threadId = null;
    const openai = new OpenAI();
    if (isUsingExplainVariant) {
      const thread = await openai.beta.threads.create();
      threadId = thread.id;
    }

    const attemptId: Id<"attempts"> = await ctx.runMutation(
      internal.attempts.insert,
      {
        exerciseId,
        userId,
        threadId,
      },
    );

    if (isUsingExplainVariant && exercise.firstMessage) {
      await ctx.scheduler.runAfter(0, internal.chat.sendMessageInternal, {
        attemptId,
        message: exercise.firstMessage,
      });
    }

    return attemptId;
  },
});

export const isUsingExplainVariant = internalQuery({
  args: {
    exerciseId: v.id("exercises"),
    userId: v.id("users"),
  },
  handler: async ({ db }, { exerciseId, userId }) => {
    const exercise = await db.get(exerciseId);
    if (exercise === null) throw new Error("Unknown exercise");

    const weekId = exercise.weekId;
    if (weekId === null) {
      throw new ConvexError("This exercise has been deleted");
    }

    const week = await db.get(weekId);
    if (week === null) throw new Error("No week");

    const registration = await db
      .query("registrations")
      .withIndex("by_user_and_course", (q) =>
        q.eq("userId", userId).eq("courseId", week.courseId),
      )
      .first();
    if (!registration) throw new Error("User not enrolled in the course.");

    const { controlGroup } = exercise;
    if (controlGroup === "all") return false;
    if (controlGroup === "none") return true;

    // @TODO Remove this logic
    return (
      registration.researchGroup &&
      registration.researchGroup.id !== controlGroup
    );
  },
});

export const goToQuiz = mutationWithAuth({
  args: {
    attemptId: v.id("attempts"),
  },
  handler: async ({ db, session }, { attemptId }) => {
    if (!session) throw new ConvexError("Not logged in");

    const attempt = await db.get(attemptId);
    if (attempt === null) throw new ConvexError("Unknown attempt");

    if (attempt.userId !== session.user._id) {
      throw new Error("Attempt from someone else");
    }

    const exercise = await db.get(attempt.exerciseId);
    if (exercise === null) throw new Error("No exercise");
    await validateDueDate(db, exercise, session.user);

    if (
      attempt.status !== "exercise" &&
      attempt.status !== "exerciseCompleted"
    ) {
      throw new Error("Unexpected state " + attempt.status);
    }

    await db.insert("logs", {
      type: "quizStarted",
      userId: session.user._id,
      attemptId,
      exerciseId: attempt.exerciseId,
    });

    await db.patch(attemptId, {
      status: "quiz",
    });
  },
});
*/
