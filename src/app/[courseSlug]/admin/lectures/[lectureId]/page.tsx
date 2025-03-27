"use client";

import { useAction, useQuery } from "@/usingSession";
import React from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import LectureForm, { toConvexState } from "@/components/LectureForm";
import Title from "@/components/typography";
import { toast } from "sonner";
import { useCourseSlug } from "@/hooks/useCourseSlug";

export default function EditExercise() {
  const router = useRouter();
  const params = useParams();
  const update = useAction(api.admin.lectures.update);
  const courseSlug = useCourseSlug();

  const lecture = useQuery(api.admin.lectures.get, {
    id: params.lectureId as Id<"lectures">,
    courseSlug,
  });

  return (
    <div className="bg-slate-100 h-full p-10 flex justify-center">
      <div className="max-w-6xl flex-1">
        <Title backHref={`/${courseSlug}/admin/lectures`}>Edit Lecture</Title>

        {lecture === null && <p>Not found</p>}
        {lecture && (
          <LectureForm
            lectureId={lecture._id}
            type="update"
            initialState={{
              weekId: lecture.weekId,
              name: lecture.name,
              url: lecture.url,
              image: lecture.image,
              firstMessage: lecture.firstMessage,
            }}
            onSubmit={async (state) => {
              await update({
                courseSlug,
                id: lecture._id,
                lecture: toConvexState(state),
              });
              toast.success("Lecture updated successfully.");
              router.push(`/${courseSlug}/admin/lectures`);
            }}
          />
        )}
      </div>
    </div>
  );
}
