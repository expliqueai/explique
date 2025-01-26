"use client";

import { useAction } from "@/usingSession";
import { useParams, useRouter } from "next/navigation";

import LectureForm, { toConvexState } from "@/components/LectureForm";
import { Id } from "../../../../../../../convex/_generated/dataModel";
import { api } from "../../../../../../../convex/_generated/api";
import Title from "@/components/typography";
import { toast } from "sonner";
import { useCourseSlug } from "@/hooks/useCourseSlug";

export default function NewLecture() {
  const router = useRouter();
  const params = useParams();
  const initialWeekId = params.weekId as Id<"weeks">;
  const courseSlug = useCourseSlug();

  const create = useAction(api.admin.lectures.create);

  return (
    <div className="bg-slate-100 h-full p-10 flex justify-center">
      <div className="max-w-6xl flex-1">
        <Title backHref={`/${courseSlug}/admin/lectures`}>New Lecture</Title>
        <LectureForm
          submitLabel="Create"
          initialState={{
            weekId: initialWeekId,
            name: "",
            image: undefined,
            url: "",
          }}
          onSubmit={async (state) => {
            await create({ courseSlug, lecture: toConvexState(state) });
            toast.success("Lecture created successfully.");
            router.push(`/${courseSlug}/admin/lectures`);
          }}
        />
      </div>
    </div>
  );
}
