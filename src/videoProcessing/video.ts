"use server";

import { GoogleGenerativeAIProvider } from "@ai-sdk/google";
import { generateText } from "ai";
import { createProcessingSystemPrompt } from "./prompts/gemini-pro-processing";
import { readFileSync } from "node:fs";
import { VideoSegment } from "./segment";

export async function* processVideo(
  google: GoogleGenerativeAIProvider,
  segments: Array<VideoSegment>,
) {
  const segmentPromises = segments.map(async (segment) => {
    return processVideoSegment(google, segment.path, segment.offset);
  });

  for await (const segmentProcessData of segmentPromises) {
    yield segmentProcessData;
  }
}

export async function processVideoSegment(
  google: GoogleGenerativeAIProvider,
  segmentPath: string,
  segmentOffset: number,
) {
  const result = await generateText({
    model: google("models/gemini-1.5-pro-latest", {
      safetySettings: [
        { category: "HARM_CATEGORY_CIVIC_INTEGRITY", threshold: "BLOCK_NONE" },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_NONE",
        },
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_NONE",
        },
      ],
    }),
    system: createProcessingSystemPrompt(),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Please analyze this video segment and provide a detailed report following the instructions.",
          },
          {
            type: "file",
            mimeType: "video/mp4",
            data: readFileSync(segmentPath),
          },
        ],
      },
    ],
  });

  return adjustTimestamps(result.text, segmentOffset);
}

function parseTime(time: string) {
  const [hours, minutes, seconds] = time.split(":").map(Number);
  return hours * 3600 + minutes * 60 + seconds;
}

function formatTime(seconds: number) {
  const hours = Math.floor(seconds / 3600)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((seconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const sec = (seconds % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}:${sec}`;
}

function adjustTimestamps(text: string, seconds: number): string {
  return text.replace(
    /\[(\d{2}:\d{2}:\d{2}) to (\d{2}:\d{2}:\d{2})\]/g,
    (_, start, end) => {
      const newStartTime = parseTime(start) + seconds;
      const newEndTime = parseTime(end) + seconds;
      return `[${formatTime(newStartTime)} to ${formatTime(newEndTime)}]`;
    },
  );
}
