import { internalMutation } from "../_generated/server";
import Chance from "chance";
import { Question } from "../quiz";

export default internalMutation(async ({ db }) => {
  const toUpdate = await db
    .query("logs")
    .withIndex("by_type_and_version", (q) =>
      q.eq("type", "quizSubmission").eq("version", undefined),
    )
    .take(1500);

  for (const row of toUpdate) {
    const details = row.details;
    if (typeof details !== "object") {
      throw new Error("missing details");
    }

    const questions = details.questions;
    if (!Array.isArray(questions)) {
      throw new Error("missing questions");
    }

    await db.patch(row._id, {
      details: {
        ...details,
        questions: questions.map((q, questionIndex) => {
          const chanceAnswersOrder = new Chance(
            `${row.exerciseId} ${row.userId} ${questionIndex} answers order`,
          );

          const result: Question = {
            question: q.question,
            answers:
              q.randomize === false
                ? q.answers
                : chanceAnswersOrder.shuffle(q.answers),
          };

          return result;
        }),
      },
      version: BigInt(2),
    });
  }

  console.log("Updated: " + toUpdate.length);
});
