import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { downloadYoutubeVideo } from "./download";
import { Id } from "../../convex/_generated/dataModel";
import { processVideo } from "./video";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { splitVideoIntoSegments } from "./segment";
import fs from "fs/promises";

export async function processYoutubeVideo(
  lectureId: Id<"lectures">,
  lectureUrl: string,
) {
  // Update status of the lecture to "DOWNLOADING" using convex
  const convexClient = new ConvexHttpClient(
    process.env.NEXT_PUBLIC_CONVEX_URL!,
  );

  await convexClient.mutation(api.lectures.updateStatus, {
    id: lectureId,
    status: "DOWNLOADING",
  });

  const videoFileData = await downloadYoutubeVideo(lectureUrl);
  if (!videoFileData) {
    await convexClient.mutation(api.lectures.updateStatus, {
      id: lectureId,
      status: "FAILED",
    });

    return;
  }

  await convexClient.mutation(api.lectures.updateStatus, {
    id: lectureId,
    status: "PROCESSING",
  });

  const videoSegments = await splitVideoIntoSegments(
    videoFileData.path,
    videoFileData.tempdir,
    120,
  );

  const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_AI_API_KEY,
  });

  for await (const segmentData of processVideo(google, videoSegments)) {
    await convexClient.mutation(api.lectures.addChunk, {
      id: lectureId,
      chunk: {
        ...segmentData,
      },
    });
  }

  await convexClient.mutation(api.lectures.updateStatus, {
    id: lectureId,
    status: "DONE",
  });

  // Clean up the temporary files
  await fs.rm(videoFileData.tempdir, { recursive: true });
}
