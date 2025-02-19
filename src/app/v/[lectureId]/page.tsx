"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@/usingSession";
import { Id } from "../../../../convex/_generated/dataModel";
import { api } from "../../../../convex/_generated/api";

export default function LecturePage() {
  const params = useParams();
  const lectureId = params.lectureId as Id<"lectures">;

  const messages = useQuery(api.video.chat.getMessages, {
    lectureId,
  });

  return (
    <div>
      <h1>Lecture</h1>
    </div>
  );
}
