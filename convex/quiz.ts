import { ConvexError, v } from "convex/values";
import { mutationWithAuth } from "./auth/withAuth";
import { validateDueDate } from "./weeks";
import { Doc, Id } from "./_generated/dataModel";
import Chance from "chance";

export type Question = {
  question: string;
  answers: { text: string; correct: boolean }[];
};

function indexes(count: number) {
  const result: number[] = [];
  for (let i = 0; i < count; i++) {
    result.push(i);
  }
  return result;
}

function batchIndex(
  userId: Id<"users">,
  stepId: Id<"steps">,
  registration: Doc<"registrations">,
  batchesCount: number,
) {
  // Assign a random batch based on the user ID
  const chanceBatch = new Chance(`${userId} ${stepId} batch`);
  return chanceBatch.integer({ min: 0, max: batchesCount - 1 });
}

export function shownQuestions(
  quiz: { batches: { randomize?: boolean; questions: Question[] }[] } | null,
  userId: Id<"users">,
  stepId: Id<"steps">,
  registration: Doc<"registrations">,
): Question[] {
  if (quiz === null) return [];

  if (quiz.batches.length === 0) throw new ConvexError("No quiz batches");

  const batch =
    quiz.batches[batchIndex(userId, stepId, registration, quiz.batches.length)];

  if (batch.randomize === false) return batch.questions;

  const chanceQuestionsOrder = new Chance(
    `${userId} ${stepId} questions order`,
  );
  return chanceQuestionsOrder.shuffle(batch.questions);
}

export const submit = mutationWithAuth({
  args: {
    attemptId: v.id("attempts"),
    answers: v.array(v.number()),
  },
  handler: async ({ db, session }, { attemptId, answers }) => {
    if (!session) throw new ConvexError("Not logged in");
    const userId = session.user._id;

    const attempt = await db.get(attemptId);
    if (attempt === null) throw new ConvexError("Unknown attempt");

    const step = await db.get(attempt.currentStepId);
    if (step === null) throw new ConvexError("Unknown step");
    if (step.variant !== "quiz") {
      throw new ConvexError("You are not currently doing a quiz exercise.");
    }
    const stepId = step._id;

    const exercise = await db.get(attempt.exerciseId);
    if (exercise === null) throw new Error("No exercise");

    const weekId = exercise.weekId;
    if (weekId === null) {
      throw new ConvexError("This exercise has been deleted");
    }

    const week = await db.get(weekId);
    if (week === null) throw new Error("No week");

    const registration = await db
      .query("registrations")
      .withIndex("by_user_and_course", (q) =>
        q.eq("userId", session.user._id).eq("courseId", week.courseId),
      )
      .first();
    if (!registration) throw new Error("User not enrolled in the course.");

    if (attempt.userId !== session.user._id && registration.role !== "admin") {
      throw new Error("Attempt from someone else");
    }

    await validateDueDate(db, exercise, session.user);

    const questions = shownQuestions(
      step,
      attempt.userId,
      step._id,
      registration,
    );
    const correctAnswers = questions.map((q, questionIndex) => {
      const chanceAnswersOrder = new Chance(
        `${exercise._id} ${userId} ${questionIndex} answers order`,
      );

      const correctAnswer = chanceAnswersOrder
        .shuffle(q.answers)
        .findIndex((a) => a.correct);
      if (correctAnswer === -1) throw new ConvexError("No correct answer");
      return correctAnswer;
    });
    if (correctAnswers.length !== answers.length) {
      throw new ConvexError("Incorrect number of answers");
    }

    const isCorrect = answers.every((a, i) => correctAnswers[i] === a);

    await db.insert("quizSubmissions", { stepId, answers });

    if (isCorrect) {
      const user = await db.get(session.user._id);
      if (!user) throw new Error("No user");
      if (!registration.completedExercises.includes(attempt.exerciseId)) {
        await db.patch(registration._id, {
          completedExercises: [
            ...registration.completedExercises,
            attempt.exerciseId,
          ],
        });
      }

      await db.patch(attemptId, {
        currentStepCompleted: true,
      });
    }

    db.insert("logs", {
      type: "quizSubmission",
      userId,
      attemptId,
      exerciseId: attempt.exerciseId,
      details: {
        questions,
        answers,
        correctness:
          answers.filter((a, i) => correctAnswers[i] === a).length /
          answers.length,
      },
    });

    return { isCorrect };
  },
});
