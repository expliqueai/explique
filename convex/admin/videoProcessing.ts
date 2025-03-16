import { ConvexError, v } from "convex/values";
import { internalAction, internalMutation } from "../_generated/server";
import { LECTURE_STATUS, lectureSchema } from "../schema";
import { internal } from "../_generated/api";
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

export default internalAction({
  args: {
    lectureId: v.id("lectures"),
    ...lectureSchema,
  },
  handler: async (ctx, { lectureId, url }) => {
    if (!url) {
      throw new ConvexError("No URL provided for the lecture video");
    }

    try {
      // Check for the processing URL environment variable
      const processingUrl = process.env.LECTURES_PROCESSING_URL;
      if (!processingUrl) {
        await ctx.runMutation(
          internal.admin.videoProcessing.setProcessingStatus,
          {
            lectureId,
            status: "FAILED",
          },
        );
        throw new Error(
          "LECTURES_PROCESSING_URL environment variable is not configured",
        );
      }

      // Set lecture status to processing
      await ctx.runMutation(
        internal.admin.videoProcessing.setProcessingStatus,
        {
          lectureId,
          status: "PROCESSING",
        },
      );

      const response = await fetch(processingUrl, {
        method: "POST",
        body: JSON.stringify({
          url,
          convexUrl: process.env.CONVEX_CLOUD_URL,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok || !response.body) {
        await ctx.runMutation(
          internal.admin.videoProcessing.setProcessingStatus,
          {
            lectureId,
            status: "FAILED",
          },
        );
        throw new Error(`Failed to fetch video: ${response.statusText}`);
      }

      // Process the streamed response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        // Convert the chunk to text and add it to the video
        const chunk = decoder.decode(value);
        await ctx.runMutation(internal.admin.lectures.addChunkToVideo, {
          lectureId,
          chunk,
        });
      }

      // Set lecture status to ready when done
      await ctx.runMutation(
        internal.admin.videoProcessing.setProcessingStatus,
        {
          lectureId,
          status: "READY",
        },
      );

      const openai = new OpenAI();
      const assistant = await openai.beta.assistants.create({
        instructions: SYSTEM_PROMPT,
        model: "gpt-4o",
      });

      await ctx.runMutation(internal.admin.lectures.setAssistantId, {
        lectureId,
        assistantId: assistant.id,
      });
    } catch (error) {
      // Set lecture status to error if something goes wrong
      await ctx.runMutation(
        internal.admin.videoProcessing.setProcessingStatus,
        {
          lectureId,
          status: "FAILED",
        },
      );

      console.error("Error processing video:", error);
      throw error;
    }
  },
});

export const setProcessingStatus = internalMutation({
  args: {
    lectureId: v.id("lectures"),
    status: LECTURE_STATUS,
  },
  handler: async (ctx, { lectureId, status }) => {
    return await ctx.db.patch(lectureId, { status: status });
  },
});
