import { google } from "@ai-sdk/google"
import { generateObject, generateText } from "ai"
import { ConvexError, v } from "convex/values"
import { z } from "zod"
import { internal } from "./_generated/api"
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server"
import { actionWithAuth, mutationWithAuth, queryWithAuth } from "./auth/withAuth"

const VALIDATION_MODEL = google("gemini-2.5-flash")

const DEFAULT_HANDWRITTEN_CHECK_PROMPT = `Is this image of a handwritten solution (written by hand on paper, tablet, or iPad)?
Answer NO if it is a screenshot of a typed/digital document, a PDF, or computer-generated text.
Answer YES if it shows handwriting, even if it's messy or on a tablet.`

const DEFAULT_REASONABLE_ATTEMPT_PROMPT = `Does this image show a reasonable attempt at solving the problem?
A reasonable attempt means the student has written some relevant work (equations, diagrams, explanations, steps).
IMPORTANT: Be very lenient. Accept anything that shows genuine effort. NEVER reject a correct solution.
Only reject if the image is blank, completely illegible, or clearly unrelated to the problem.`

// --- Queries ---

export const getSubmission = queryWithAuth({
  args: {
    attemptId: v.id("attempts"),
  },
  handler: async ({ db, session }, { attemptId }) => {
    if (!session) throw new ConvexError("Not logged in")

    const attempt = await db.get(attemptId)
    if (!attempt) throw new ConvexError("Unknown attempt")
    if (attempt.userId !== session.user._id) {
      throw new ConvexError("Forbidden")
    }

    return await db
      .query("openProblemSubmissions")
      .withIndex("by_attempt", (q) => q.eq("attemptId", attemptId))
      .order("desc")
      .first()
  },
})

export const getApprovedSubmission = internalQuery({
  args: {
    attemptId: v.id("attempts"),
  },
  handler: async ({ db }, { attemptId }) => {
    const submissions = await db
      .query("openProblemSubmissions")
      .withIndex("by_attempt", (q) => q.eq("attemptId", attemptId))
      .collect()

    return submissions.find((s) => s.validationStatus === "approved") ?? null
  },
})

// --- Mutations ---

export const generateUploadUrl = mutationWithAuth({
  args: {
    attemptId: v.id("attempts"),
  },
  handler: async ({ db, session, storage }, { attemptId }) => {
    if (!session) throw new ConvexError("Not logged in")

    const attempt = await db.get(attemptId)
    if (!attempt) throw new ConvexError("Unknown attempt")
    if (attempt.userId !== session.user._id) {
      throw new ConvexError("Forbidden")
    }

    return await storage.generateUploadUrl()
  },
})

export const createSubmission = internalMutation({
  args: {
    attemptId: v.id("attempts"),
    storageIds: v.array(v.id("_storage")),
  },
  handler: async ({ db }, { attemptId, storageIds }) => {
    // Delete any existing submissions for this attempt (re-upload)
    const existing = await db
      .query("openProblemSubmissions")
      .withIndex("by_attempt", (q) => q.eq("attemptId", attemptId))
      .collect()

    for (const sub of existing) {
      await db.delete(sub._id)
    }

    return await db.insert("openProblemSubmissions", {
      attemptId,
      storageIds,
      validationStatus: "validating",
    })
  },
})

export const updateValidation = internalMutation({
  args: {
    submissionId: v.id("openProblemSubmissions"),
    validationStatus: v.union(v.literal("approved"), v.literal("rejected")),
    rejectionReason: v.optional(v.string()),
  },
  handler: async ({ db }, { submissionId, validationStatus, rejectionReason }) => {
    await db.patch(submissionId, {
      validationStatus,
      rejectionReason,
    })
  },
})

export const patchAttemptStatus = internalMutation({
  args: {
    attemptId: v.id("attempts"),
    status: v.union(
      v.literal("exercise"),
      v.literal("awaitingUpload"),
      v.literal("quizCompleted"),
    ),
  },
  handler: async ({ db }, { attemptId, status }) => {
    await db.patch(attemptId, { status })
  },
})

export const markComplete = internalMutation({
  args: {
    attemptId: v.id("attempts"),
  },
  handler: async ({ db }, { attemptId }) => {
    const attempt = await db.get(attemptId)
    if (!attempt) throw new ConvexError("Unknown attempt")

    const exercise = await db.get(attempt.exerciseId)
    if (!exercise) throw new ConvexError("Exercise not found")

    const weekId = exercise.weekId
    if (weekId === null) throw new ConvexError("Deleted exercise")

    const week = await db.get(weekId)
    if (!week) throw new ConvexError("Week not found")

    // Mark exercise as completed in registration
    const registration = await db
      .query("registrations")
      .withIndex("by_user_and_course", (q) =>
        q.eq("userId", attempt.userId).eq("courseId", week.courseId),
      )
      .first()
    if (registration && !registration.completedExercises.includes(exercise._id)) {
      await db.patch(registration._id, {
        completedExercises: [...registration.completedExercises, exercise._id],
      })
    }

    await db.patch(attemptId, { status: "quizCompleted" })

    await db.insert("logs", {
      type: "exerciseCompleted",
      userId: attempt.userId,
      attemptId,
      exerciseId: exercise._id,
      variant: "open-problem" as const,
    })
  },
})

export const createFeedbackMessage = internalMutation({
  args: {
    attemptId: v.id("attempts"),
  },
  handler: async ({ db }, { attemptId }) => {
    // Set status to exerciseCompleted so the input doesn't show
    await db.patch(attemptId, { status: "exerciseCompleted" as const })

    return await db.insert("messages", {
      attemptId,
      system: true,
      content: "",
      appearance: "feedback",
    })
  },
})

export const generateFeedback = internalAction({
  args: {
    attemptId: v.id("attempts"),
    feedbackMessageId: v.id("messages"),
    problemStatement: v.string(),
    storageIds: v.array(v.id("_storage")),
  },
  handler: async (ctx, { attemptId, feedbackMessageId, problemStatement, storageIds }) => {
    const imageUrls: string[] = []
    for (const sid of storageIds) {
      const url = await ctx.storage.getUrl(sid)
      if (url) imageUrls.push(url)
    }

    try {
      const response = await generateText({
        model: VALIDATION_MODEL,
        messages: [
          {
            role: "system",
            content: `You are a helpful math/science tutor providing feedback on a student's handwritten solution.
The problem was: "${problemStatement}"

The student's solution is correct. Provide brief, encouraging feedback (2-4 sentences).
Highlight what they did well. If there are minor improvements possible (notation, clarity), mention them gently.
Use markdown formatting.`,
          },
          {
            role: "user",
            content: imageUrls.map((url) => ({
              type: "image" as const,
              image: new URL(url),
            })),
          },
        ],
        temperature: 0.7,
        abortSignal: AbortSignal.timeout(3 * 60 * 1000),
      })

      await ctx.runMutation(internal.chat.saveFeedback, {
        attemptId,
        feedbackMessageId,
        feedback: response.text,
      })
    } catch (err) {
      console.error("Feedback generation error", err)
      await ctx.runMutation(internal.chat.saveFeedback, {
        attemptId,
        feedbackMessageId,
        feedback: "error",
      })
    }

    // Mark exercise as complete
    await ctx.runMutation(internal.openProblem.markComplete, { attemptId })
  },
})

// --- Actions ---

export const saveAndValidate = actionWithAuth({
  args: {
    attemptId: v.id("attempts"),
    storageIds: v.array(v.id("_storage")),
  },
  handler: async (ctx, { attemptId, storageIds }) => {
    if (!ctx.session) throw new ConvexError("Not logged in")

    // Verify ownership
    const attempt = await ctx.runQuery(internal.attempts.getRow, { id: attemptId })
    if (!attempt) throw new ConvexError("Unknown attempt")
    if (attempt.userId !== ctx.session.user._id) {
      throw new ConvexError("Forbidden")
    }

    const exercise = await ctx.runQuery(internal.exercises.getRow, {
      id: attempt.exerciseId,
    })
    if (!exercise) throw new ConvexError("Exercise not found")
    if (!exercise.openProblem) throw new ConvexError("Not an open-problem exercise")
    if (storageIds.length > 3) throw new ConvexError("Maximum 3 images allowed")

    // Validate due date
    await ctx.runMutation(internal.weeks.validateDueDateFromActionQuery, {
      id: exercise.weekId!,
      exerciseId: exercise._id,
      userId: ctx.session.user._id,
    })

    // Create submission record (deletes old ones)
    const submissionId = await ctx.runMutation(
      internal.openProblem.createSubmission,
      { attemptId, storageIds }
    )

    // Fetch image URLs for AI validation
    const imageUrls: string[] = []
    for (const sid of storageIds) {
      const url = await ctx.storage.getUrl(sid)
      if (!url) throw new ConvexError("Upload failed")
      imageUrls.push(url)
    }

    const handwrittenPrompt =
      exercise.openProblem.handwrittenCheckPrompt || DEFAULT_HANDWRITTEN_CHECK_PROMPT
    const reasonablePrompt =
      exercise.openProblem.reasonableAttemptPrompt || DEFAULT_REASONABLE_ATTEMPT_PROMPT

    try {
      const result = await generateObject({
        model: VALIDATION_MODEL,
        schema: z.object({
          isHandwritten: z.object({
            passed: z.boolean(),
            reasoning: z.string(),
          }),
          isReasonableAttempt: z.object({
            passed: z.boolean(),
            reasoning: z.string(),
          }),
          isSolutionCorrect: z.object({
            passed: z.boolean(),
            reasoning: z.string(),
          }),
        }),
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `You are evaluating a student's uploaded solution for this problem:
"${exercise.openProblem.problemStatement}"

Please assess the following three criteria:

1. Handwritten check:
${handwrittenPrompt}

2. Reasonable attempt check:
${reasonablePrompt}

3. Correctness check:
Is the solution correct and complete? Does it address all parts of the problem?
Be rigorous but fair. Minor notation issues are fine. Focus on whether the student has the right approach and correct answer.

When in doubt on criteria 1 and 2, approve. It is much worse to reject a valid upload than to accept an invalid one.
For criterion 3, be accurate — if the solution has real errors or is incomplete, mark it as not passed.`,
              },
              ...imageUrls.map((url) => ({
                type: "image" as const,
                image: new URL(url),
              })),
            ],
          },
        ],
        temperature: 0.2,
      })

      const { isHandwritten, isReasonableAttempt, isSolutionCorrect } = result.object

      if (!isHandwritten.passed || !isReasonableAttempt.passed) {
        // Upload rejected — not handwritten or not a real attempt
        const reason = !isHandwritten.passed
          ? "Please upload a handwritten solution (photo of paper or iPad)."
          : "Please show more work on the problem before uploading."

        await ctx.runMutation(internal.openProblem.updateValidation, {
          submissionId,
          validationStatus: "rejected",
          rejectionReason: reason,
        })
      } else if (isSolutionCorrect.passed) {
        // Correct solution — generate feedback then complete
        await ctx.runMutation(internal.openProblem.updateValidation, {
          submissionId,
          validationStatus: "approved",
        })
        // createFeedbackMessage sets status to exerciseCompleted (no input shown)
        const feedbackMessageId = await ctx.runMutation(
          internal.openProblem.createFeedbackMessage,
          { attemptId }
        )
        await ctx.scheduler.runAfter(0, internal.openProblem.generateFeedback, {
          attemptId,
          feedbackMessageId,
          problemStatement: exercise.openProblem.problemStatement,
          storageIds,
        })
      } else {
        // Incorrect solution — start chat so AI can discuss issues
        await ctx.runMutation(internal.openProblem.updateValidation, {
          submissionId,
          validationStatus: "approved",
        })
        await ctx.runMutation(internal.openProblem.patchAttemptStatus, {
          attemptId,
          status: "exercise",
        })
        if (exercise.firstMessage) {
          await ctx.scheduler.runAfter(0, internal.chat.sendMessageInternal, {
            attemptId,
            message: exercise.firstMessage,
          })
        }
      }
    } catch (err) {
      console.error("Validation error", err)
      // On error, approve and start chat to avoid blocking students
      await ctx.runMutation(internal.openProblem.updateValidation, {
        submissionId,
        validationStatus: "approved",
      })
      await ctx.runMutation(internal.openProblem.patchAttemptStatus, {
        attemptId,
        status: "exercise",
      })
      if (exercise.firstMessage) {
        await ctx.scheduler.runAfter(0, internal.chat.sendMessageInternal, {
          attemptId,
          message: exercise.firstMessage,
        })
      }
    }
  },
})
