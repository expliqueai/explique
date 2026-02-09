"use client"

import { ImageLink } from "@/components/ImageLink"
import { useCourseSlug } from "@/hooks/useCourseSlug"
import { useQuery } from "@/usingSession"
import { formatTimestampHumanFormat } from "@/util/date"
import { api } from "../../../../../convex/_generated/api"

export default function LecturesPage() {
  const courseSlug = useCourseSlug()
  const user = useQuery(api.courses.getRegistration, { courseSlug })

  return user ? <ProjectGrid /> : <ProjectGridSkeleton />
}

function ProjectGrid() {
  const courseSlug = useCourseSlug()
  const weeks = useQuery(api.lectures.list, { courseSlug })

  if (!weeks) {
    return <ProjectGridSkeleton />
  }

  return (
    <div className="grid gap-12">
      {weeks.map((week) => {
        return (
          <div key={week.id}>
            <header className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="mb-4 text-3xl font-medium tracking-tight">
                {week.name}
              </h2>
            </header>
            {week.lectures.length == 0 && (
              <p className="mb-4 text-gray-700">
                <span className="mr-2 inline-block rounded-lg bg-amber-200 px-2 py-1 font-semibold text-amber-900 uppercase">
                  No lectures uploaded yet
                </span>
                Your instructor(s) will upload the lectures soon.
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {week.lectures.map((lecture) => (
                <ImageLink
                  key={lecture.id}
                  href={`/${courseSlug}/v/${lecture.id}`}
                  name={lecture.name}
                  image={lecture.image}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ProjectGridSkeleton() {
  return (
    <div className="grid gap-12">
      {Array.from({ length: 3 }).map((_, i) => (
        <div className="animate-pulse" key={i}>
          <div className="flex h-9 flex-wrap">
            <div className="mr-[20%] flex-1 rounded bg-slate-200" />
            <div className="w-36 rounded-full bg-slate-200" />
          </div>

          <div className="my-4 h-6 w-72 rounded bg-slate-200" />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-3xl bg-slate-200 pb-[57.14%]" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
