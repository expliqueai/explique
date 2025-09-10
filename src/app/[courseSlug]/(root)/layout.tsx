"use client"

import CourseSelector from "@/components/header/CourseSelector"
import CurrentUser from "@/components/header/CurrentUer"
import { TabBar } from "@/components/TabBar"
import { useCourseSlug } from "@/hooks/useCourseSlug"
import { useQuery } from "@/usingSession"
import { api } from "../../../../convex/_generated/api"

export default function CourseLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const courseSlug = useCourseSlug()
  const user = useQuery(api.courses.getRegistration, { courseSlug })

  return (
    <>
      <div className="bg-gradient-to-b from-purple-200 via-indigo-200 to-blue-200">
        <div className="flex justify-center p-6 pb-0 sm:p-10 sm:pb-0">
          <div className="max-w-6xl flex-1">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
              <div className="my-2 flex-1 cursor-default text-3xl font-medium tracking-tight select-none">
                explique.ai
              </div>
              <CurrentUser />
            </div>

            <div className="mx-auto mt-8 w-full max-w-2xl rounded-t-2xl bg-white p-2 shadow-[0_-20px_40px_-12px_rgb(0_0_0/0.1)] sm:p-8 md:p-8">
              <CourseSelector />
            </div>
          </div>
        </div>
      </div>
      <div className="relative flex justify-center p-6 shadow-[0_-10px_10px_-3px_rgba(0_0_0/0.08)] sm:p-10">
        <div className="max-w-6xl flex-1">
          <TabBar
            items={[
              { label: "Exercises", href: `/${courseSlug}/exercises` },
              { label: "Lectures", href: `/${courseSlug}/lectures` },
              user?.isAdmin && {
                label: "Admin",
                href: `/${courseSlug}/admin`,
              },
              user?.isSuperadmin && {
                label: "Superadmin",
                href: `/superadmin`,
              },
            ].filter(isDefined)}
          />
          {children}
          <div className="h-10" />
        </div>
      </div>
    </>
  )
}

function isDefined<T>(argument: T | false | undefined): argument is T {
  return argument != undefined && argument !== false
}
