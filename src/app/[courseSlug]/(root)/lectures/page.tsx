"use client";

import { api } from "../../../../../convex/_generated/api";
import clsx from "clsx";
import { useQuery } from "@/usingSession";
import { formatTimestampHumanFormat, timeFromNow } from "@/util/date";
import { useCourseSlug } from "@/hooks/useCourseSlug";
import { ImageLink } from "@/components/ImageLink";

export default function LecturesPage() {
  const courseSlug = useCourseSlug();
  const user = useQuery(api.courses.getRegistration, { courseSlug });

  return user ? <ProjectGrid /> : <ProjectGridSkeleton />;
}

function ProjectGrid() {
  const courseSlug = useCourseSlug();
  const weeks = useQuery(api.lectures.list, { courseSlug });

  if (!weeks) {
    return <ProjectGridSkeleton />;
  }

  return (
    <div className="grid gap-12">
      {weeks.map((week) => {
        return (
          <div key={week.id}>
            <header className="flex gap-4 flex-wrap items-center justify-between">
              <h2 className="font-medium text-3xl tracking-tight mb-4">
                {week.name}
              </h2>
            </header>
            {week.preview && (
              <p className="text-gray-700 mb-4">
                <span className="inline-block bg-amber-200 px-2 py-1 rounded-lg mr-2 text-amber-900 uppercase tracking-wider font-semibold">
                  Preview
                </span>
                Will be released on{" "}
                <strong className="font-medium text-gray-800">
                  {formatTimestampHumanFormat(week.startDate)}
                </strong>
              </p>
            )}
            <div className="grid gap-6 md:grid-cols-2">
              {week.lectures.map((lecture) => (
                <ImageLink
                  key={lecture.id}
                  href={`/lecture/${lecture.id}`}
                  name={lecture.name}
                  image={lecture.image}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ProjectGridSkeleton() {
  return (
    <div className="grid gap-12">
      {Array.from({ length: 3 }).map((_, i) => (
        <div className="animate-pulse" key={i}>
          <div className="flex flex-wrap h-9">
            <div className="bg-slate-200 rounded flex-1 mr-[20%]" />
            <div className="bg-slate-200 rounded-full w-36" />
          </div>

          <div className="h-6 my-4 bg-slate-200 rounded w-72" />

          <div className="grid gap-6 md:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="pb-[57.14%] bg-slate-200 rounded-3xl" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Deadline({
  timestamp,
  red = false,
}: {
  timestamp: number;
  red?: boolean;
}) {
  return (
    <>
      <strong
        className={clsx("font-medium", red ? "text-red-800" : "text-gray-800")}
      >
        {formatTimestampHumanFormat(timestamp)}
      </strong>
      {Date.now() < timestamp && (
        <span> ({timeFromNow(new Date(timestamp))})</span>
      )}
    </>
  );
}
