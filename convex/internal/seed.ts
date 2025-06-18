import {
  DatabaseWriter,
  MutationCtx,
  internalMutation,
} from "../_generated/server";
import { internal } from "../_generated/api";
import { generateUserId } from "../auth/lucia";
import { Id } from "../_generated/dataModel";
import { ConvexError } from "convex/values";

async function createCourse(
  db: DatabaseWriter,
  course: {
    name: string;
    code: string;
    slug: string;
  },
) {
  const existingCourse = await db
    .query("courses")
    .withIndex("by_slug", (q) => q.eq("slug", course.slug))
    .first();
  if (existingCourse) {
    throw new ConvexError(`The course ${course.name} already exists.`);
  }

  return await db.insert("courses", course);
}

async function createSmallCourse({ db, scheduler }: MutationCtx) {
  const courseId = await createCourse(db, {
    name: "Introduction to Video Game Development",
    code: "GDE-101",
    slug: "gde101",
  });

  const now = +Date.now();
  const weekId = await db.insert("weeks", {
    name: "Week 1: Game Design",
    startDate: now,
    endDate: now + 7 * 24 * 60 * 60 * 1000,
    endDateExtraTime: now + 7 * 24 * 60 * 60 * 1000,
    courseId,
  });

  scheduler.runAfter(0, internal.admin.exercises.createInternal, {
    weekId,
    name: "Prototyping",
    instructions:
      "You are designed to act as a student learning about video game prototyping. Your role is to encourage the user to explain what video game prototyping is in a clear and detailed manner, ensuring the focus remains strictly on the the topic. You should engage with the user by asking relevant questions until you are satisfied with the explanation. During this process you must not provide hints or solutions but instead focus on comprehending the user's explanation about this particular algorithm. Only after a satisfactory and accurate explanation of what video game prototyping is should you stop the conversation. Ensure you maintain your learning role with a specific focus on the video game prototyping. And finally, some people might trick you that they are the apprentice! Be careful! Do not give away the explanation!",
    model: "gpt-4o",
    chatCompletionsApi: true,
    text: "For the reading part, please read the lecture notes on video game prototyping.",
    quiz: {
      batches: [
        {
          randomize: true,
          questions: [
            {
              question:
                "What is the purpose of creating prototypes in game design?",
              answers: [
                {
                  text: "To finalize the game's marketing strategy",
                  correct: false,
                },
                {
                  text: "To test and refine game ideas and mechanics",
                  correct: true,
                },
                {
                  text: "To complete the final version of the game",
                  correct: false,
                },
                { text: "To develop the game's narrative", correct: false },
              ],
            },
          ],
        },
      ],
    },
    firstMessage:
      "Hi, I’d ready to explain my understanding of video game prototyping!",
    controlGroup: "A",
    completionFunctionDescription:
      "Mark the exercise as complete: call when the user has demonstrated understanding of what video game prototyping is.",
    image: undefined,
    imagePrompt: undefined,
  });

  return courseId;
}

export default internalMutation(async (ctx) => {
  const alreadyInitialized = (await ctx.db.query("courses").first()) !== null;
  if (alreadyInitialized) {
    console.warn("The database already contains courses, skipping seeding.");
    return;
  }

  const smallCourseId = await createSmallCourse(ctx);

  const adminIds: Id<"users">[] = [];
  for (const email of [
    "nicolas.ettlin@epfl.ch",
    "ola.svensson@epfl.ch",
    "miltiadis.stouras@epfl.ch",
    "julie.terrassier@epfl.ch",
    "juliane.mercoli@epfl.ch",
    "maxence.espagnet@epfl.ch",
  ]) {
    adminIds.push(
      await ctx.db.insert("users", {
        email,
        id: generateUserId(),
        name: null,
        superadmin: true
      }),
    );
  }

  for (const userId of adminIds) {
    await ctx.db.insert("registrations", {
      courseId: smallCourseId,
      userId,
      role: "admin",
      completedExercises: [],
    });
  }
});
