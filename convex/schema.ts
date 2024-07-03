import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema(
  {
    courses: defineTable({
      name: v.string(),
      code: v.string(),
      slug: v.string(),
    }).index("by_slug", ["slug"]),

    attempts: defineTable({
      completed: v.boolean(), // whether the user completly finished the exercise
      currentStepId: v.id("steps"),

      // Whether the user completed the current step and can continue to the next step
      // (quiz: answer it successfully, explain: give a complete explanation)
      currentStepCompleted: v.boolean(),

      exerciseId: v.id("exercises"),
      userId: v.id("users"),

      // When the user is doing explanation exercises with the OpenAI assistants API,
      // this stores the thread ID for the conversation.
      threads: v.array(
        v.object({
          stepId: v.id("steps"),
          threadId: v.string(),
        }),
      ),
    }).index("by_key", ["userId", "exerciseId"]),

    exercises: defineTable({
      name: v.string(),
      weekId: v.union(v.id("weeks"), v.null()), // null = soft-deleted exercise

      text: v.string(), // the text the users need to read for the reading exercise

      image: v.optional(v.id("images")),
      imagePrompt: v.optional(v.string()),

      steps: v.array(v.id("steps")),
    }).index("by_week_id", ["weekId"]),

    steps: defineTable(
      v.union(
        v.object({
          variant: v.literal("read"),
          text: v.string(),
        }),

        v.object({
          variant: v.literal("explain"),
          instructions: v.string(), // instructions for the chatbot in the explanation part

          model: v.union(
            v.object({
              type: v.literal("OpenAIChatCompletion"),
              openAiModel: v.string(),
            }),
            v.object({
              type: v.literal("OpenAIAssistant"),
              openAiModel: v.string(),
              assistantId: v.string(),
            }),
          ),
          completionFunctionDescription: v.string(),

          feedback: v.optional(
            // whether to provide some feedback after the explanation
            v.object({
              openAiModel: v.string(), // the OpenAI model used for the feedback
              prompt: v.string(), // the system prompt of the feedback part
            }),
          ),

          firstMessage: v.optional(v.string()),
        }),

        v.object({
          variant: v.literal("quiz"),
          batches: v.array(
            v.object({
              randomize: v.optional(v.boolean()),
              questions: v.array(
                v.object({
                  question: v.string(),
                  answers: v.array(
                    v.object({
                      text: v.string(),
                      correct: v.boolean(),
                    }),
                  ),
                }),
              ),
            }),
          ),
        }),
      ),
    ),

    quizSubmissions: defineTable({
      stepId: v.id("steps"),
      answers: v.array(v.number()),
    }).index("by_step_id", ["stepId"]),

    weeks: defineTable({
      courseId: v.id("courses"),

      name: v.string(),
      startDate: v.number(),
      endDate: v.number(),
      endDateExtraTime: v.number(),

      // Overwrite this value to ensure that queries depending on start/end dates
      // are invalidated.
      cacheInvalidation: v.optional(v.number()),
    }).index("by_course_and_start_date", ["courseId", "startDate"]),

    images: defineTable({
      storageId: v.id("_storage"),
      thumbnails: v.array(
        v.object({
          type: v.string(),
          storageId: v.id("_storage"),
          sizes: v.optional(v.string()),
        }),
      ),
      model: v.string(),
      size: v.string(),
      prompt: v.string(),
      quality: v.union(v.literal("standard"), v.literal("hd")),
      exerciseId: v.id("exercises"),
    }).index("by_exercise_id", ["exerciseId"]),

    messages: defineTable({
      attemptId: v.id("attempts"),
      system: v.boolean(),
      content: v.string(),
      appearance: v.optional(
        v.union(
          v.literal("finished"),
          v.literal("feedback"),
          v.literal("typing"),
          v.literal("error"),
        ),
      ),
    }).index("by_attempt", ["attemptId"]),

    reports: defineTable({
      attemptId: v.id("attempts"),
      messageId: v.id("messages"),
      courseId: v.id("courses"),
      reason: v.string(),
    })
      .index("by_attempt", ["attemptId"])
      .index("by_message", ["messageId"])
      .index("by_course", ["courseId"]),

    logs: defineTable({
      type: v.union(
        v.literal("attemptStarted"),
        v.literal("messageSent"),
        v.literal("answerGenerated"),
        v.literal("exerciseCompleted"),
        v.literal("feedbackGiven"),
        v.literal("quizStarted"),
        v.literal("quizSubmission"),
      ),
      userId: v.id("users"),
      attemptId: v.id("attempts"),
      exerciseId: v.id("exercises"),
      userMessageId: v.optional(v.id("messages")),
      systemMessageId: v.optional(v.id("messages")),
      details: v.optional(v.any()),
    }).index("by_type", ["type"]),

    registrations: defineTable({
      userId: v.id("users"),
      courseId: v.id("courses"),
      role: v.union(
        // Can manage the course
        v.literal("admin"),
        // Can see exercises before they are released
        v.literal("ta"),
        v.null(),
      ),
      completedExercises: v.array(v.id("exercises")),
    })
      .index("by_user", ["userId"])
      .index("by_course", ["courseId"])
      .index("by_course_and_role", ["courseId", "role"])
      .index("by_user_and_course", ["userId", "courseId"]),

    // Lucia
    users: defineTable({
      id: v.string(), // Lucia user ID
      email: v.union(v.string(), v.null()),
      name: v.union(v.string(), v.null()),
      googleId: v.optional(v.string()),
      googleMetadata: v.optional(v.any()),
      identifier: v.optional(v.string()),
      extraTime: v.optional(v.literal(true)),
      superadmin: v.optional(v.literal(true)),
    })
      .index("by_lucia_id", ["id"])
      .index("by_email", ["email"])
      .index("byIdentifier", ["identifier"])
      .index("by_google_id", ["googleId"]),

    sessions: defineTable({
      id: v.string(), // Lucia session ID
      userId: v.string(), // Lucia user ID
      expiresAt: v.number(),
    })
      .index("by_lucia_id", ["id"])
      .index("by_user_id", ["userId"])
      .index("by_expires_at", ["expiresAt"]),
  },
  {
    schemaValidation: true,
  },
);
