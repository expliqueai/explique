"use server";

import { spawn } from "node:child_process";
import * as fs from "fs";
import * as path from "path";

export interface VideoSegment {
  path: string;
  duration: number;
  start: number;
}

export async function splitVideoIntoSegments(
  videoPath: string,
  videoDir: string,
  segmentDuration: number,
) {
  const outputDir = path.join(videoDir, "segments");
  await fs.promises.mkdir(outputDir, { recursive: true });

  const ffmpegArgs = [
    "-i",
    videoPath,
    "-preset",
    "veryfast",
    "-c",
    "copy",
    "-f",
    "segment",
    "-segment_time",
    segmentDuration.toString(),
    "-reset_timestamps",
    "1",
    path.join(outputDir, "chunk_%03d.mp4"),
  ];

  // Spawn the FFmpeg process with error logging
  const ffmpeg = spawn("ffmpeg", ffmpegArgs, {
    stdio: "pipe",
    shell: false,
  });

  await new Promise((resolve, reject) => {
    ffmpeg.on("exit", (code) => {
      if (code === 0) {
        resolve(null);
      } else {
        reject(
          new Error(
            `FFmpeg exited with code ${code}, check console for details`,
          ),
        );
      }
    });
  });

  const segments: VideoSegment[] = [];
  let cumulativeOffset = 0;

  // Sort chunks by sequence number for correct order
  const segmentNames = (await fs.promises.readdir(outputDir))
    .filter((name) => name.startsWith("chunk_"))
    .sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)?.[0] || "0");
      const numB = parseInt(b.match(/\d+/)?.[0] || "0");
      return numA - numB;
    });

  for (const segmentName of segmentNames) {
    const segmentPath = path.join(outputDir, segmentName);
    const duration = await getVideoDuration(segmentPath);

    segments.push({
      path: segmentPath,
      duration,
      start: cumulativeOffset,
    });

    cumulativeOffset += duration;
  }

  return segments;
}

function getVideoDuration(videoPath: string) {
  return new Promise<number>((resolve, reject) => {
    const ffprobe = spawn("ffprobe", [
      "-v",
      "error", // Only show error messages
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      videoPath,
    ]);

    let stdoutData = "";
    let stderrData = "";

    ffprobe.stdout.on("data", (data) => {
      stdoutData += data.toString();
    });

    ffprobe.stderr.on("data", (data) => {
      stderrData += data.toString();
    });

    ffprobe.on("close", (code) => {
      if (code === 0) {
        // Parse the duration value from ffprobe output
        const duration = parseInt(stdoutData);
        resolve(duration);
      } else {
        reject(
          new Error(stderrData.trim() || "Failed to retrieve video duration."),
        );
      }
    });

    ffprobe.on("error", (err) => {
      reject(err);
    });
  });
}
