"use client";

import { useMutation } from "@/usingSession";
import React from "react";
import { useRouter } from "next/navigation";
import WeekForm from "@/components/WeekForm";
import { api } from "../../../../../../convex/_generated/api";
import Title from "@/components/typography";
import { useCourseSlug } from "@/hooks/useCourseSlug";

export default function NewWeek() {
  const router = useRouter();
  const create = useMutation(api.admin.weeks.create);
  const courseSlug = useCourseSlug();

  return (
    <div className="bg-slate-100 h-full p-10 flex justify-center">
      <div className="max-w-xl flex-1">
        <Title backHref={`/${courseSlug}/admin`}>New Week</Title>

        <WeekForm
          onSubmit={async (state) => {
            await create({ courseSlug, weekDetails: state });
            router.push(`/${courseSlug}/admin`);
          }}
          initialState={{
            name: "",
            startDate: "",
            softEndDate: null,
            endDate: "",
          }}
          submitLabel="Create"
        />
      </div>
    </div>
  );
}
