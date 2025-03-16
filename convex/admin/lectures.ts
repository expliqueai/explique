import { ConvexError, v } from "convex/values";
import {
  action,
  ActionCtx,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
} from "../_generated/server";
import { api, internal } from "../_generated/api";
import { LECTURE_STATUS, lectureSchema } from "../schema";
import {
  actionWithAuth,
  mutationWithAuth,
  queryWithAuth,
} from "../auth/withAuth";
import { getCourseRegistration } from "../courses";
import { Id } from "../_generated/dataModel";
import { getImageForLecture } from "../lectures";
import OpenAI from "openai";

const SYSTEM_PROMPT = `
You are an AI language model designed to assist users in navigating and understanding the content of a video. Your capabilities include answering questions about specific moments in the video using the preprocessed data provided. You can also suggest insightful questions to help users explore the video content more deeply.

Instructions for User Interaction:
- Allow the user to ask questions related to specific timestamps in the video.
- Utilize the processed video and audio data efficiently to answer inquiries.
- Provide clear, concise, and informative answers based on the content at the specified timestamps.
- Offer to guide the user to related or relevant segments of the video if needed.
- Suggest potential questions the user may find interesting on the topics of the video.
- Do not describe what's happening on the video segment except if it is useful for your answer. The user is watching the video, so he already knows.
- Do not answer a question that is not related to the video or to the subject of the video. (e.g.: Make a react component...)
- Make your answers as concise as possible.
- Before answering, check if the segment contains an error. If so, ONLY provide the next timestamp where you can answer and say that you cannot safely provide an answer because there was an error in the video processing.

Important: You MUST put timestamps inside <timestamp> and </timestamp> tags. NEVER mention anything about the preprocessed video segments, events and slides. These are keywords used internally by you to differenciate data.

Ensure all interactions are concise and accurate, based on the comprehensive preprocessed data, while maintaining a friendly and helpful tone to assist the user in understanding the video's educational content. Strive for brevity while ensuring all information is rooted in the data above, fostering a deeper understanding of the video’s educational content through thoughtful dialog. Use LaTeX for any necessary mathematical expressions to maintain clarity and precision.

---

Video data:

Important: The timestamp of the beginning of a segment is inclusive but the timestamp of the end of a segment is exclusive.

`;

export const get = queryWithAuth({
  args: {
    id: v.id("lectures"),
    courseSlug: v.string(),
  },
  handler: async ({ db, session }, { id, courseSlug }) => {
    await getCourseRegistration(db, session, courseSlug, "admin");

    const lecture = await db.get(id);
    if (!lecture) {
      throw new ConvexError("Lecture not found");
    }

    const { weekId } = lecture;
    if (weekId === null) {
      throw new ConvexError("The lecture has been deleted");
    }

    return { ...lecture, weekId };
  },
});

export const list = queryWithAuth({
  args: {
    courseSlug: v.string(),
  },
  handler: async ({ db, session, storage }, { courseSlug }) => {
    const { course } = await getCourseRegistration(
      db,
      session,
      courseSlug,
      "admin",
    );

    const weeks = await db
      .query("weeks")
      .withIndex("by_course_and_start_date", (q) =>
        q.eq("courseId", course._id),
      )
      .order("desc")
      .collect();

    // @TODO Only query the lectures from this course
    const lectures = await db.query("lectures").collect();

    const result = [];
    for (const week of weeks) {
      const resultLectures = [];
      for (const lecture of lectures) {
        if (lecture.weekId === week._id) {
          resultLectures.push({
            id: lecture._id,
            name: lecture.name,
            url: lecture.url,
            image: await getImageForLecture(db, storage, lecture),
          });
        }
      }

      result.push({
        ...week,
        lectures: resultLectures,
      });
    }

    return result;
  },
});

export const insertRow = internalMutation({
  args: { ...lectureSchema },
  handler: async ({ db }, row) => {
    return await db.insert("lectures", row);
  },
});

export const updateRow = internalMutation({
  args: {
    id: v.id("lectures"),
    row: v.object({
      ...lectureSchema,
    }),
  },
  handler: async ({ db }, { id, row }) => {
    // Verify that the course isn’t changed
    const existing = await db.get(id);
    if (!existing) {
      throw new ConvexError("Lecture not found");
    }

    const oldWeekId = existing.weekId;
    const newWeekId = row.weekId;

    if (newWeekId === null) {
      throw new ConvexError("Invalid data");
    }

    if (oldWeekId === null) {
      throw new ConvexError("Can’t unpublish this lecture");
    }

    // Verify that the lecture stays in the same course
    const oldWeek = await db.get(oldWeekId);
    const newWeek = await db.get(newWeekId);
    if (!oldWeek || !newWeek || newWeek.courseId !== oldWeek.courseId) {
      throw new ConvexError("The course of an exercise cannot be changed");
    }

    return await db.replace(id, row);
  },
});

export const createInternal = internalAction({
  args: lectureSchema,
  handler: async ({ runMutation }, row): Promise<Id<"lectures">> => {
    return await runMutation(internal.admin.lectures.insertRow, {
      ...{ ...row, sessionId: undefined },
    });
  },
});

export const create = actionWithAuth({
  args: {
    courseSlug: v.string(),
    lecture: v.object(lectureSchema),
  },
  handler: async (ctx, { courseSlug, lecture }): Promise<Id<"lectures">> => {
    const { course } = await getCourseRegistration(
      ctx,
      ctx.session,
      courseSlug,
      "admin",
    );

    const { weekId } = lecture;
    if (weekId === null) {
      throw new ConvexError("Invalid week ID");
    }

    // Validate the week ID
    const week = await ctx.runQuery(internal.admin.weeks.getInternal, {
      id: weekId,
    });
    if (!week || week.courseId !== course._id) {
      throw new ConvexError("Invalid week");
    }

    const id = await ctx.runAction(
      internal.admin.lectures.createInternal,
      lecture,
    );

    await ctx.scheduler.runAfter(0, internal.admin.lectures.processVideo, {
      lectureId: id,
      url: lecture.url,
    });

    return id;
  },
});

export const processVideo = internalAction({
  args: {
    lectureId: v.id("lectures"),
    url: v.string(),
  },
  handler: async (ctx, { lectureId, url }) => {
    try {
      // Check for the processing URL environment variable
      const processingUrl = process.env.LECTURES_PROCESSING_URL;
      if (!processingUrl) {
        throw new Error(
          "LECTURES_PROCESSING_URL environment variable is not configured",
        );
      }

      const response = await fetch(processingUrl, {
        method: "POST",
        body: JSON.stringify({
          url,
          convexUrl: process.env.CONVEX_CLOUD_URL,
          lectureId,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok || !response.body) {
        throw new Error(
          `Failed to start video processing: ${response.statusText}`,
        );
      }

      await ctx.runMutation(api.admin.lectures.setStatus, {
        lectureId,
        status: "PROCESSING",
        authToken: process.env.VIDEO_PROCESSING_API_TOKEN!,
      });
    } catch (error) {
      await ctx.runMutation(api.admin.lectures.setStatus, {
        lectureId,
        status: "FAILED",
        authToken: process.env.VIDEO_PROCESSING_API_TOKEN!,
      });

      throw error;
    }
  },
});

export const createAssistant = action({
  args: {
    lectureId: v.id("lectures"),
    authToken: v.string(),
  },
  handler: async (ctx, { lectureId, authToken }) => {
    if (authToken !== process.env.VIDEO_PROCESSING_API_TOKEN) {
      throw new ConvexError("Invalid authentification token");
    }

    const chunks = await ctx.runQuery(internal.admin.lectures.getChunks, {
      lectureId,
    });
    if (!chunks) {
      throw new ConvexError("Lecture chunks not found");
    }

    const openai = new OpenAI();
    const assistant = await openai.beta.assistants.create({
      instructions: SYSTEM_PROMPT + chunks.join("\n"),
      model: "gpt-4o",
    });

    await ctx.runMutation(api.admin.lectures.setAssistantId, {
      lectureId,
      assistantId: assistant.id,
      authToken,
    });
  },
});

export const getChunks = internalQuery({
  args: {
    lectureId: v.id("lectures"),
  },
  handler: async (ctx, { lectureId }) => {
    const lecture = await ctx.db.get(lectureId);
    if (!lecture) {
      throw new ConvexError("Lecture not found");
    }
    return lecture.chunks || [];
  },
});

export const setAssistantId = mutation({
  args: {
    lectureId: v.id("lectures"),
    assistantId: v.string(),
    authToken: v.string(),
  },
  handler: async (ctx, { lectureId, assistantId, authToken }) => {
    if (authToken !== process.env.VIDEO_PROCESSING_API_TOKEN) {
      throw new ConvexError("Invalid authentification token");
    }

    return await ctx.db.patch(lectureId, { assistantId });
  },
});

export const setStatus = mutation({
  args: {
    lectureId: v.id("lectures"),
    status: LECTURE_STATUS,
    authToken: v.string(),
  },
  handler: async (ctx, { lectureId, status, authToken }) => {
    if (authToken !== process.env.VIDEO_PROCESSING_API_TOKEN) {
      throw new ConvexError("Invalid authentification token");
    }

    return await ctx.db.patch(lectureId, { status: status });
  },
});

export const addChunk = mutation({
  args: {
    lectureId: v.id("lectures"),
    chunk: v.string(),
    authToken: v.string(),
  },
  handler: async (ctx, { lectureId, chunk, authToken }) => {
    if (authToken !== process.env.VIDEO_PROCESSING_API_TOKEN) {
      throw new ConvexError("Invalid authentification token");
    }

    const lecture = await ctx.db.get(lectureId);
    if (!lecture) {
      throw new ConvexError("Lecture not found");
    }

    return await ctx.db.patch(lectureId, {
      chunks: [...(lecture.chunks || []), chunk],
    });
  },
});

export const courseSlugOfLecture = internalQuery({
  args: {
    id: v.id("lectures"),
  },
  handler: async (ctx, args) => {
    const lecture = await ctx.db.get(args.id);
    if (!lecture) {
      throw new ConvexError("Lecture not found");
    }

    const weekId = lecture.weekId;
    if (weekId === null) {
      throw new ConvexError("This lecture has been deleted");
    }
    const week = await ctx.db.get(weekId);
    if (!week) {
      throw new ConvexError("Week not found");
    }

    const course = await ctx.db.get(week.courseId);
    if (!course) {
      throw new ConvexError("Course not found");
    }

    return course.slug;
  },
});

export async function validateLectureInCourse(
  ctx: Omit<ActionCtx, "auth">,
  courseSlug: string,
  id: Id<"lectures">,
) {
  const lectureCourseSlug = await ctx.runQuery(
    internal.admin.lectures.courseSlugOfLecture,
    { id },
  );
  if (lectureCourseSlug !== courseSlug) {
    throw new ConvexError("Lecture not found");
  }
}

export const update = actionWithAuth({
  args: {
    id: v.id("lectures"),
    lecture: v.object(lectureSchema),
    courseSlug: v.string(),
  },
  handler: async (ctx, { id, lecture, courseSlug }) => {
    await getCourseRegistration(ctx, ctx.session, courseSlug, "admin");
    await validateLectureInCourse(ctx, courseSlug, id);

    await ctx.runMutation(internal.admin.lectures.updateRow, {
      id,
      row: lecture,
    });
  },
});

export const softDelete = mutationWithAuth({
  args: {
    id: v.id("lectures"),
    courseSlug: v.string(),
  },
  handler: async (ctx, { id, courseSlug }) => {
    const { course } = await getCourseRegistration(
      ctx.db,
      ctx.session,
      courseSlug,
      "admin",
    );

    const lecture = await ctx.db.get(id);
    if (!lecture) {
      throw new ConvexError("Lecture not found");
    }

    const weekId = lecture.weekId;
    if (weekId === null) {
      throw new ConvexError("The lecture has already been deleted");
    }

    const week = await ctx.db.get(weekId);
    if (!week) {
      throw new Error("Week not found");
    }
    if (week.courseId !== course._id) {
      throw new ConvexError("Lecture not found");
    }

    await ctx.db.patch(lecture._id, { weekId: null });
  },
});
