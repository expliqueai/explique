import { validateAdminRequest } from "@/util/admin";
import { downloadYoutubeVideo } from "@/videoProcessing/download";
import { NextResponse } from "next/server";
import { api } from "../../../../../convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { processYoutubeVideo } from "@/videoProcessing/pipeline";

export async function POST(req: Request) {
  const adminError = validateAdminRequest(req);
  if (adminError !== null) return adminError;

  let json;
  try {
    json = await req.json();
  } catch (e) {
    console.log(e);
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const { courseSlug, lectureId, lectureUrl: rawLectureUrl } = json;
  if (!courseSlug || !lectureId || !rawLectureUrl) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  processYoutubeVideo(lectureId, decodeURIComponent(rawLectureUrl));

  return NextResponse.json({ message: "Processing started", status: 200 });
}
