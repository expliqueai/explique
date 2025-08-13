"use client";

import { useCourseSlug } from "@/hooks/useCourseSlug";
import { useQuery } from "@/usingSession";
import { api } from "../../../../convex/_generated/api";
import { TabBar } from "@/components/TabBar";
import CurrentUser from "@/components/header/CurrentUer";
import CourseSelector from "@/components/header/CourseSelector";

export default function CourseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const courseSlug = useCourseSlug();
  const user = useQuery(api.courses.getRegistration, { courseSlug });

  return (
    <>
      <div className="bg-linear-to-b from-purple-200 via-indigo-200 to-blue-200">
        <div className="p-6 sm:p-10 pb-0 sm:pb-0 flex justify-center">
          <div className="max-w-6xl flex-1">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
              <div className="flex-1 text-3xl tracking-tight font-medium select-none cursor-default my-2">
                explique.ai
              </div>
              <CurrentUser />
            </div>

            <div className="bg-white shadow-[0_-20px_40px_-12px_rgb(0_0_0/0.1)] rounded-t-2xl p-2 sm:p-8 md:p-14 w-full max-w-2xl mx-auto mt-8">
              <CourseSelector />
            </div>
          </div>
        </div>
      </div>
      <div className="relative p-6 sm:p-10 flex justify-center shadow-[0_-10px_10px_-3px_rgba(0_0_0/0.08)]">
        <div className="max-w-6xl flex-1">
          <TabBar
            items={[
              {
                label: "Super-Assistant",
                href: `/${courseSlug}/super-assistant`,
              },
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
  );
}

function isDefined<T>(argument: T | false | undefined): argument is T {
  return argument != undefined && argument !== false;
}
