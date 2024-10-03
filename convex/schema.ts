import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const exerciseAdminSchema = {
  name: v.string(),
  instructions: v.string(),
  model: v.string(),
  chatCompletionsApi: v.optional(v.literal(true)),
  feedback: v.optional(
    v.object({
      model: v.string(),
      prompt: v.string(),
    }),
  ),
  weekId: v.id("weeks"),
  text: v.string(),
  quiz: v.union(
    v.object({
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
    v.null(),
  ),
  firstMessage: v.optional(v.string()),
  controlGroup: v.union(
    v.literal("A"),
    v.literal("B"),
    v.literal("none"),
    v.literal("all"),
  ),
  completionFunctionDescription: v.string(),
  image: v.optional(v.id("images")),
  imagePrompt: v.optional(v.string()),
} as const;

export default defineSchema(
  {
    attempts: defineTable({
      status: v.union(
        v.literal("exercise"),
        v.literal("exerciseCompleted"),
        v.literal("quiz"),
        v.literal("quizCompleted"),
      ),
      exerciseId: v.id("exercises"),
      userId: v.id("users"),
      threadId: v.union(v.string(), v.null()), // null: reading variant, otherwise: explain variant
    })
      .index("by_key", ["userId", "exerciseId"])
      .index("by_status", ["status"]),
    quizSubmissions: defineTable({
      attemptId: v.id("attempts"),
      answers: v.array(v.number()),
    }).index("attemptId", ["attemptId"]),
    weeks: defineTable({
      name: v.string(),
      startDate: v.number(),
      endDate: v.number(),
      endDateExtraTime: v.number(),

      // Overwrite this value to ensure that queries depending on start/end dates
      // are invalidated.
      cacheInvalidation: v.optional(v.number()),
    }).index("startDate", ["startDate"]),
    exercises: defineTable({ ...exerciseAdminSchema, assistantId: v.string() }),
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
      reason: v.string(),
    })
      .index("by_attempt", ["attemptId"])
      .index("by_message", ["messageId"]),
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
      variant: v.union(v.literal("reading"), v.literal("explain")),
      details: v.optional(v.any()),
      version: v.optional(v.int64()),
    })
      .index("by_type", ["type"])
      .index("by_type_and_version", ["type", "version"]),

    groupAssignments: defineTable({
      identifier: v.string(),
      group: v.union(v.literal("A"), v.literal("B")),
      researchConsent: v.optional(v.literal(true)),
      positionInGroup: v.optional(v.number()),
      groupLength: v.optional(v.number()),
    })
      .index("byIdentifier", ["identifier"])
      .index("byGroup", ["group"]),

    // Lucia
    users: defineTable({
      id: v.string(), // Lucia ID
      email: v.union(v.string(), v.null()),
      name: v.union(v.string(), v.null()),
      identifier: v.optional(v.string()),
      isAdmin: v.boolean(),
      earlyAccess: v.optional(v.literal(true)),
      researchConsent: v.optional(v.literal(true)),
      group: v.union(v.literal("A"), v.literal("B")),
      extraTime: v.optional(v.literal(true)),
      completedExercises: v.array(v.id("exercises")),
    })
      .index("byId", ["id"])
      .index("byEmail", ["email"])
      .index("byIdentifier", ["identifier"]),

    sessions: defineTable({
      id: v.string(),
      user_id: v.string(),
      active_expires: v.float64(),
      idle_expires: v.float64(),
    })
      .index("byId", ["id"])
      .index("byUserId", ["user_id"]),
    auth_keys: defineTable({
      id: v.string(),
      hashed_password: v.union(v.string(), v.null()),
      user_id: v.string(),
    })
      .index("byId", ["id"])
      .index("byUserId", ["user_id"]),
  },
  {
    schemaValidation: true,
  },
);
