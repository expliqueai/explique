"use server";

import ytdl from "@distube/ytdl-core";
import { createHash } from "crypto";
import fs from "fs";
import { mkdir, mkdtemp, writeFile } from "fs/promises";
import path, { join } from "path";

export interface DownloadedVideoData {
  path: string;
  hash: string;
  tempdir: string;
}

export async function downloadVideo(file: File): Promise<DownloadedVideoData> {
  const mediaDir = path.join(process.cwd(), "media");
  await mkdir(mediaDir, { recursive: true });
  const tempDir = await mkdtemp(join(mediaDir, "temp-"));

  const videoPath = path.join(tempDir, `video-${Date.now()}.mp4`);
  const buffer = Buffer.from(await file.arrayBuffer());

  // Compute hash before writing file
  const videoHash = createHash("sha256");
  videoHash.update(new Uint8Array(buffer));
  const hash = videoHash.digest("hex");

  await writeFile(videoPath, new Uint8Array(buffer));

  return {
    path: videoPath,
    hash: hash,
    tempdir: tempDir,
  };
}

export async function downloadYoutubeVideo(videoUrl: string) {
  if (!ytdl.validateURL(videoUrl)) {
    return null;
  }

  const mediaDir = path.join(process.cwd(), "media");
  await mkdir(mediaDir, { recursive: true });
  const tempDir = await mkdtemp(join(mediaDir, "temp-"));

  const videoPath = path.join(tempDir, `video-${Date.now()}.mp4`);
  const videoHash = createHash("sha256");
  const videoStream = ytdl(videoUrl, {
    filter: "videoandaudio",
  });

  return new Promise<DownloadedVideoData>((resolve, reject) => {
    const fileStream = fs.createWriteStream(videoPath);
    videoStream.pipe(fileStream);

    fileStream.on("error", reject);
    fileStream.on("finish", () =>
      resolve({
        path: videoPath,
        hash: videoHash.digest("hex"),
        tempdir: tempDir,
      }),
    );

    videoStream.on("data", (data) => videoHash.update(new Uint8Array(data)));
    videoStream.on("error", (err) => {
      fs.unlink(videoPath, () => reject(err));
    });
  });
}
