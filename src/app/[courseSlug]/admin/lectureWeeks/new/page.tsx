"use client";

import { useMutation } from "@/usingSession";
import React from "react";
import { useRouter } from "next/navigation";
import LectureWeekForm from "@/components/LectureWeekForm";
import { api } from "../../../../../../convex/_generated/api";
import Title from "@/components/typography";
import { useCourseSlug } from "@/hooks/useCourseSlug";
import { toDatetimeLocalString } from "@/util/date";

export default function NewLectureWeek() {
  const router = useRouter();
  const create = useMutation(api.admin.lectureWeeks.create);
  const courseSlug = useCourseSlug();

  return (
    <div className="bg-slate-100 h-full p-10 flex justify-center">
      <div className="max-w-xl flex-1">
        <Title backHref={`/${courseSlug}/admin/lectures`}>
          New Lecture Week
        </Title>

        <LectureWeekForm
          onSubmit={async (state) => {
            await create({ courseSlug, weekDetails: state });
            router.push(`/${courseSlug}/admin/lectures`);
          }}
          initialState={{
            name: "",
            startDate: toDatetimeLocalString(new Date()),
          }}
          submitLabel="Create"
        />
      </div>
    </div>
  );
}
