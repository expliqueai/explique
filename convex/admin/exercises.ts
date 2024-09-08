import { ConvexError, v } from "convex/values";
import { internalMutation } from "../_generated/server";
import OpenAI from "openai";
import { internal } from "../_generated/api";
import { exerciseAdminSchema } from "../schema";
import { actionWithAuth, queryWithAuth } from "../withAuth";
import { Session } from "lucia";
import { COMPLETION_VALID_MODELS } from "../chat";

export function validateAdminSession(session: Session | null) {
  if (!session) throw new ConvexError("Not logged in");
  if (!session.user.isAdmin) throw new ConvexError("Forbidden");
}

export const get = queryWithAuth({
  args: {
    id: v.id("exercises"),
  },
  handler: async ({ db, session }, { id }) => {
    validateAdminSession(session);

    const exercise = await db.get(id);
    if (!exercise) {
      return null;
    }

    return exercise;
  },
});

export const list = queryWithAuth({
  args: {},
  handler: async ({ db, session }) => {
    validateAdminSession(session);

    const weeks = await db.query("weeks").withIndex("startDate").collect();
    const exercises = await db.query("exercises").collect();

    return weeks.map((week) => ({
      ...week,
      exercises: exercises.filter((exercise) => exercise.weekId === week._id),
    }));
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
    return await db.replace(id, row);
  },
});

export async function createAssistant(
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

export const create = actionWithAuth({
  args: exerciseAdminSchema,
  handler: async ({ runMutation, session }, row) => {
    validateAdminSession(session);
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

export const update = actionWithAuth({
  args: {
    id: v.id("exercises"),
    ...exerciseAdminSchema,
  },
  handler: async ({ runMutation, session }, { id, ...row }) => {
    validateAdminSession(session);
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

    await runMutation(internal.admin.exercises.updateRow, {
      id,
      row: {
        ...{
          ...row,
          sessionId: undefined,
        },
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
      if (!question.answers.some((a) => a.correct)) {
        throw new ConvexError("Each question must have a correct answer");
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
