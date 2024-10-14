"use client";

import { useMutation, useQuery } from "@/usingSession";
import React from "react";
import { useParams, useRouter } from "next/navigation";
import WeekForm from "@/components/WeekForm";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { toDatetimeLocalString } from "@/util/date";
import Title from "@/components/typography";
import { useCourseSlug } from "@/hooks/useCourseSlug";

export default function EditWeek() {
  const router = useRouter();
  const params = useParams();
  const update = useMutation(api.admin.weeks.update);
  const courseSlug = useCourseSlug();

  const week = useQuery(api.admin.weeks.get, {
    id: params.weekId as Id<"weeks">,
    courseSlug,
  });

  return (
    <div className="bg-slate-100 h-full p-10 flex justify-center">
      <div className="max-w-xl flex-1">
        <Title backHref={`/${courseSlug}/admin/exercises`}>Edit Week</Title>

        {week === null && <p>Not found</p>}
        {week && (
          <WeekForm
            onSubmit={async (state) => {
              await update({
                weekDetails: state,
                courseSlug,
                id: week._id,
              });
              router.push(`/${courseSlug}/admin/exercises`);
            }}
            initialState={{
              name: week.name,
              startDate: toDatetimeLocalString(new Date(week.startDate)),
              softEndDate:
                week.softEndDate === undefined
                  ? null
                  : toDatetimeLocalString(new Date(week.softEndDate)),
              endDate: toDatetimeLocalString(new Date(week.endDate)),
            }}
            submitLabel="Save"
          />
        )}
      </div>
    </div>
  );
}
