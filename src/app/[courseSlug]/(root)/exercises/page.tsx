"use client";

import { api } from "../../../../../convex/_generated/api";
import { CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";
import {
  CheckIcon as CheckIconSmall,
  XMarkIcon as XMarkIconSmall,
} from "@heroicons/react/20/solid";
import clsx from "clsx";
import { useQuery } from "@/usingSession";
import { formatTimestampHumanFormat, timeFromNow } from "@/util/date";
import { useCourseSlug } from "@/hooks/useCourseSlug";
import { ImageLink } from "@/components/ImageLink";
import ProblemSolvingColumn from "@/components/super-assistant/ProblemSolvingcolumn";


function extractWeekNumber(name: string, index: number): number {
  const m = name.match(/Week\s+(\d+)/i);
  return m ? Number(m[1]) : index + 1;
}



export default function ExercisesPage() {
  const courseSlug = useCourseSlug();
  const user = useQuery(api.courses.getRegistration, { courseSlug });

  return user ? <ProjectGrid /> : <ProjectGridSkeleton />;
}

function ProjectGrid() {
  const courseSlug = useCourseSlug();
  const weeks = useQuery(api.exercises.list, { courseSlug });

  if (!weeks) {
    return <ProjectGridSkeleton />;
  }

  return (
    <div className="grid gap-12">
      {weeks.map((week) => {
        const isCompleted = week.exercises.every(
          (exercise) => exercise.completed,
        );

        return (
          <div key={week.id}>
            <header className="flex gap-4 flex-wrap items-center justify-between">
              <h2 className="font-medium text-3xl tracking-tight">
                {week.name}
              </h2>

              {isCompleted ? (
                <p className="bg-gradient-to-b from-green-500 to-green-600 py-2 px-3 text-xs rounded-full font-semibold text-white tracking-wide inline-flex items-center gap-1">
                  <CheckIconSmall className="w-5 h-5" />
                  Completed
                </p>
              ) : (
                <p className="bg-gray-500 py-2 px-3 text-xs rounded-full font-semibold text-white tracking-wide inline-flex items-center gap-1">
                  <XMarkIconSmall className="w-5 h-5" />
                  Not Completed
                </p> 
              )}
            </header>
            {week.preview && (
              <p className="text-gray-700 my-4">
                <span className="inline-block bg-amber-200 px-2 py-1 rounded-lg mr-2 text-amber-900 uppercase tracking-wider font-semibold">
                  Preview
                </span>
                Will be released on{" "}
                <strong className="font-medium text-gray-800">
                  {formatTimestampHumanFormat(week.startDate)}
                </strong>
              </p>
            )}
            <div className="text-gray-700 my-4">
              {week.softEndDate === undefined ? (
                <>
                  Due on <Deadline timestamp={week.endDate} />
                </>
              ) : Date.now() < week.softEndDate ||
                Date.now() >= week.endDate ||
                isCompleted ? (
                <>
                  Due on <Deadline timestamp={week.softEndDate} />
                </>
              ) : (
                <div className="flex flex-col gap-1">
                  <p>
                    Due on <Deadline timestamp={week.softEndDate} />
                  </p>
                  <p className="text-red-700">
                    Late submissions possible until{" "}
                    <Deadline timestamp={week.endDate} red />
                  </p>
                </div>
              )}
            </div>
            <div className="grid gap-8 lg:grid-cols-[1fr_auto_1fr]">
              <div className="grid gap-6 md:grid-cols-2">
                {week.exercises.map((exercise) => (
                  <div
                    key={exercise.id}
                    className="relative h-[210px] sm:h-[240px] rounded-3xl overflow-hidden"
                  >
                    <ImageLink
                      href={`/e/${exercise.id}`}
                      name={exercise.name}
                      image={exercise.image}
                      corner={
                        <div
                          className={clsx(
                            "w-24 h-24 tr-corner flex text-white rounded-tr-3xl",
                            exercise.completed
                              ? "bg-linear-to-b from-green-500 to-green-600"
                              : "bg-gray-500"
                          )}
                        >
                          {exercise.completed ? (
                            <CheckIcon className="absolute top-4 right-4 w-6 h-6" />
                          ) : (
                            <XMarkIcon className="absolute top-4 right-4 w-6 h-6" />
                          )}
                        </div>
                      }
                    />
                  </div>
                ))}
              </div>


              <div className="hidden lg:block w-px bg-slate-200 mx-2" />

              <div>
                <ProblemSolvingColumn
                  weekNumber={extractWeekNumber(week.name, weeks.indexOf(week))}
                />
              </div>
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