import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import OpenAI from "openai";

export const exerciseAdminSchema = {
  name: v.string(),
  instructions: v.string(), // instructions for the chatbot in the explanation part
  model: v.string(), // OpenAI model used for the chatbot
  chatCompletionsApi: v.optional(v.literal(true)), // whether to use the chat completions API instead of the assistants API
  feedback: v.optional(
    // whether to provide some feedback after the explanation
    v.object({
      model: v.string(), // the OpenAI model used for the feedback
      prompt: v.string(), // the system prompt of the feedback part
    }),
  ),
  weekId: v.union(v.id("weeks"), v.null()), // null = unpublished exercise
  text: v.string(), // the text the users need to read for the reading exercise
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
};

export default defineSchema(
  {
    courses: defineTable({
      name: v.string(),
      code: v.string(),
      slug: v.string(),
    }).index("by_slug", ["slug"]),
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
      courseId: v.id("courses"),

      name: v.string(),
      startDate: v.number(),
      endDate: v.number(),
      endDateExtraTime: v.number(),

      // Overwrite this value to ensure that queries depending on start/end dates
      // are invalidated.
      cacheInvalidation: v.optional(v.number()),
    }).index("by_course_and_start_date", ["courseId", "startDate"]),
    exercises: defineTable({
      ...exerciseAdminSchema,
      assistantId: v.string(),
    }).index("by_week_id", ["weekId"]),
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
    feedbacks: defineTable({
      status: v.union(
        v.literal("feedback"),
        v.literal("chat"),
      ),
      courseId: v.id("courses"),
      userId: v.id("users"),
      image: v.id("_storage"),
      name:  v.optional(v.string()),
      lastModified: v.number(),
    }).index("by_key", ["userId", "courseId"]),
    feedbackMessages: defineTable({
      feedbackId: v.id("feedbacks"),
      role: v.union(v.literal("user"), v.literal("system"), v.literal("assistant")),
      content: v.union(v.string(), v.array(v.union(
        v.object({ 
          type:v.literal("text"), 
          text:v.string(),
        }), v.object({
          type:v.literal("image_url"),
          image_url:v.object({ url:v.string() }),
        })
      ))),
      appearance: v.optional(
        v.union(
          v.literal("finished"),
          v.literal("feedback"),
          v.literal("typing"),
          v.literal("error"),
        ),
      ),
    }).index("by_feedback", ["feedbackId"]),
    chats: defineTable({
      courseId: v.id("courses"),
      userId: v.id("users"),
      name: v.optional(v.string()),
      lastModified: v.number(),
    }).index("by_key", ["userId", "courseId"]),
    chatMessages: defineTable({
      chatId: v.id("chats"),
      assistant: v.boolean(),
      content: v.union(v.string(), v.array(v.union(
        v.object({ 
          type:v.literal("text"), 
          text:v.string(),
        }), v.object({
          type:v.literal("image_url"),
          image_url:v.object({ url:v.string() }),
        })
      ))),
      appearance: v.optional(
        v.union(
          v.literal("finished"),
          v.literal("feedback"),
          v.literal("typing"),
          v.literal("error"),
        ),
      ),
    }).index("by_chat", ["chatId"]),
    saDatabase: defineTable({
      storageIds: v.array(
        v.object({
          pageNumber: v.number(),
          storageId: v.id("_storage"),
        }),
      ),
      courseId: v.id("courses"),
      name: v.string(),
      week: v.number(),
    })
      .index("by_course", ["courseId"])
      .index("by_week", ["week"])
      .index("by_name", ["name"]),
    reports: defineTable({
      attemptId: v.id("attempts"),
      messageId: v.id("messages"),
      courseId: v.id("courses"),
      reason: v.string(),
    })
      .index("by_attempt", ["attemptId"])
      .index("by_message", ["messageId"])
      .index("by_course", ["courseId"]),
    chatReports: defineTable({
      chatId: v.id("chats"),
      messageId: v.id("chatMessages"),
      courseId: v.id("courses"),
      reason: v.string(),
    })
      .index("by_chat", ["chatId"])
      .index("by_message", ["messageId"])
      .index("by_course", ["courseId"]),
    feedbackReports: defineTable({
        feedbackId: v.id("feedbacks"),
        messageId: v.id("feedbackMessages"),
        courseId: v.id("courses"),
        reason: v.string(),
      })
        .index("by_feedback", ["feedbackId"])
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
      variant: v.union(v.literal("reading"), v.literal("explain")),
      details: v.optional(v.any()),
    }).index("by_type", ["type"]),

    groupAssignments: defineTable({
      identifier: v.string(),
      group: v.union(v.literal("A"), v.literal("B")),
      researchConsent: v.optional(v.literal(true)),
      positionInGroup: v.optional(v.number()),
      groupLength: v.optional(v.number()),
    })
      .index("byIdentifier", ["identifier"])
      .index("byGroup", ["group"]),

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
      researchGroup: v.optional(
        v.object({
          id: v.union(v.literal("A"), v.literal("B")), // ✅
          position: v.optional(v.number()), // ✅
          length: v.optional(v.number()), // ✅
        }),
      ),
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
