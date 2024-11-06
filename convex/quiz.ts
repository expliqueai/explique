import { ConvexError, v } from "convex/values";
import { mutationWithAuth } from "./withAuth";
import { validateDueDate } from "./weeks";
import { Doc, Id } from "./_generated/dataModel";
import Chance from "chance";

export type Question =
  | {
      question: string;
      answers: { text: string; correct: boolean }[];
      randomize?: boolean;
      text?: never;
    }
  | {
      question: string;
      answers?: never;
      randomize?: never;
      text: true;
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
  exerciseId: Id<"exercises">,
  assignment: Doc<"groupAssignments"> | null,
  batchesCount: number,
) {
  // Not an imported student? Assign a random batch based on the user ID
  if (assignment === null) {
    const chanceBatch = new Chance(`${userId} ${exerciseId} batch`);
    return chanceBatch.integer({ min: 0, max: batchesCount - 1 });
  }

  if (
    assignment.positionInGroup === undefined ||
    assignment.groupLength === undefined
  ) {
    console.warn("Invalid group assignment, please run assignNumbers");

    const chanceBatch = new Chance(`${userId} ${exerciseId} batch`);
    return chanceBatch.integer({ min: 0, max: batchesCount - 1 });
  }

  // Split the group evenly between the batches
  const chanceBatch = new Chance(`${exerciseId} ${assignment.group} batch`);
  const numbers = chanceBatch.shuffle(indexes(assignment.groupLength));

  return numbers.indexOf(assignment.positionInGroup) % batchesCount;
}

export function shownQuestions(
  quiz: { batches: { randomize?: boolean; questions: Question[] }[] } | null,
  userId: Id<"users">,
  exerciseId: Id<"exercises">,
  assignment: Doc<"groupAssignments"> | null,
): Question[] {
  if (quiz === null) return [];

  if (quiz.batches.length === 0) throw new ConvexError("No quiz batches");

  const batch =
    quiz.batches[
      batchIndex(userId, exerciseId, assignment, quiz.batches.length)
    ];

  if (batch.randomize === false) return batch.questions;

  const chanceQuestionsOrder = new Chance(
    `${userId} ${exerciseId} questions order`,
  );
  return chanceQuestionsOrder.shuffle(batch.questions);
}

export const submit = mutationWithAuth({
  args: {
    attemptId: v.id("attempts"),
    answers: v.array(
      v.union(
        v.number(), // single-choice questions
        v.string(), // text questions
      ),
    ),
  },
  handler: async ({ db, session }, { attemptId, answers }) => {
    if (!session) throw new ConvexError("Not logged in");
    const userId = session.user._id;

    const attempt = await db.get(attemptId);
    if (attempt === null) throw new ConvexError("Unknown attempt");

    if (attempt.userId !== session.user._id && !session.user.isAdmin) {
      throw new Error("Attempt from someone else");
    }

    const exercise = await db.get(attempt.exerciseId);
    if (exercise === null) throw new Error("No exercise");
    await validateDueDate(db, exercise, session.user);

    if (attempt.status !== "quiz") {
      throw new ConvexError("Incorrect status " + attempt.status);
    }

    const { identifier } = session.user;
    const assignment = identifier
      ? await db
          .query("groupAssignments")
          .withIndex("byIdentifier", (q) => q.eq("identifier", identifier))
          .first()
      : null;

    const questions = shownQuestions(
      exercise.quiz,
      attempt.userId,
      attempt.exerciseId,
      assignment,
    );
    const correctAnswers: (number[] | null)[] = questions.map(
      (q, questionIndex) => {
        if (q.text) return null;

        const chanceAnswersOrder = new Chance(
          `${exercise._id} ${userId} ${questionIndex} answers order`,
        );

        const answersInOrder =
          q.randomize === false
            ? q.answers
            : chanceAnswersOrder.shuffle(q.answers);

        return answersInOrder.flatMap((answer, answerOrderedIndex) =>
          answer.correct ? [answerOrderedIndex] : [],
        );
      },
    );
    if (correctAnswers.length !== answers.length) {
      throw new ConvexError("Incorrect number of answers");
    }

    const correctness =
      answers.filter(
        (a, i) =>
          correctAnswers[i]! === null /* expected a textual answer */ ||
          (typeof a === "number" && correctAnswers[i]!.includes(a)),
      ).length / answers.length;
    const isCorrect = correctness === 1;

    await db.insert("quizSubmissions", {
      attemptId,
      answers,
    });

    if (isCorrect) {
      const user = await db.get(session.user._id);
      if (!user) throw new Error("No user");
      if (!user.completedExercises.includes(attempt.exerciseId)) {
        await db.patch(user._id, {
          completedExercises: [...user.completedExercises, attempt.exerciseId],
        });
      }

      await db.patch(attemptId, {
        status: "quizCompleted",
      });
    }

    db.insert("logs", {
      type: "quizSubmission",
      userId,
      attemptId,
      exerciseId: attempt.exerciseId,
      variant: attempt.threadId === null ? "reading" : "explain",
      details: {
        questions: questions.map((q, questionIndex) => {
          if (q.text) {
            return q;
          }

          // Reorder answers to match the user's submission
          const chanceAnswersOrder = new Chance(
            `${attempt.exerciseId} ${userId} ${questionIndex} answers order`,
          );

          const result: Question = {
            question: q.question,
            answers:
              q.randomize === false
                ? chanceAnswersOrder.shuffle(q.answers)
                : q.answers,
          };

          return result;
        }),
        answers,
        correctness,
      },
      version: BigInt(2),
    });

    return { isCorrect };
  },
});
