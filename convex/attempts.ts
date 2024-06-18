import { ConvexError, v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
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

    const week = await db.get(exercise.weekId);
    if (week === null) throw new Error("No week");

    const course = await db.get(week.courseId);
    if (course === null) throw new Error("No course");

    const registration = await db
      .query("registrations")
      .withIndex("by_user_and_course", (q) =>
        q.eq("userId", session.user._id).eq("courseId", course._id),
      )
      .first();
    if (!registration) throw new Error("User not enrolled in the course.");

    if (attempt.userId !== session.user._id && registration.role !== "admin") {
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

    const lastQuizSubmission = await db
      .query("quizSubmissions")
      .withIndex("attemptId", (q) => q.eq("attemptId", attempt._id))
      .order("desc")
      .first();

    let quiz = null;
    if (
      exercise.quiz !== null &&
      (attempt.status === "quiz" ||
        attempt.status === "quizCompleted" ||
        isSolutionShown)
    ) {
      const { identifier } = session.user;

      quiz = shownQuestions(
        exercise.quiz,
        attempt.userId,
        attempt.exerciseId,
        registration,
      ).map((question, questionIndex) =>
        toUserVisibleQuestion(
          question,
          isSolutionShown,
          session.user._id,
          exercise._id,
          questionIndex,
        ),
      );
    }

    return {
      courseSlug: course.slug,
      exerciseId: exercise._id,
      exerciseName: exercise.name,
      status: attempt.status,
      isDue,
      isSolutionShown,
      isAdmin: registration.role === "admin",
      text:
        attempt.threadId !== null
          ? null
          : (isSolutionShown ||
              attempt.status === "exercise" ||
              attempt.status === "exerciseCompleted") &&
            exercise.text,
      quiz,
      lastQuizSubmission: lastQuizSubmission
        ? {
            answers: lastQuizSubmission.answers,
            timestamp: lastQuizSubmission._creationTime,
          }
        : null,
      hasQuiz: exercise.quiz !== null,
    };
  },
});

function toUserVisibleQuestion(
  question: Question,
  isSolutionShown: boolean,
  userId: Id<"users">,
  exerciseId: Id<"exercises">,
  questionIndex: number,
): {
  question: string;
  answers: string[];
  correctAnswer: string | null;
} {
  const chanceAnswersOrder = new Chance(
    `${exerciseId} ${userId} ${questionIndex} answers order`,
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

export const insert = internalMutation({
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
      variant: threadId === null ? "reading" : "explain",
    });

    return attemptId;
  },
});

export const start = actionWithAuth({
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

    const week = await db.get(exercise.weekId);
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
      variant: attempt.threadId === null ? "reading" : "explain",
    });

    await db.patch(attemptId, {
      status: "quiz",
    });
  },
});
