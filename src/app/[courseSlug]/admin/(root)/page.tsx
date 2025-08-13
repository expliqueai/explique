"use client";

import Title from "@/components/typography";
import { useCourseSlug } from "@/hooks/useCourseSlug";
import { useQuery } from "@/usingSession";
import { api } from "../../../../../convex/_generated/api";
import { Button } from "@/components/Button";
import { PencilSquareIcon } from "@heroicons/react/20/solid";

export default function AdminExercisePage() {
  const courseSlug = useCourseSlug();
  const course = useQuery(api.admin.course.get, { courseSlug });

  return (
    <>
      <Title>
        <span className="flex-1">Course</span>

        <Button href={`/${courseSlug}/admin/edit`}>
          <PencilSquareIcon className="w-5 h-5" />
          Edit
        </Button>
      </Title>

      <div className="bg-linear-to-b from-purple-200 via-indigo-200 to-blue-200 rounded-lg shadow-sm">
        <div className="p-6 sm:p-10 flex justify-center">
          <div className="max-w-6xl flex-1">
            <div className="bg-white shadow-xl rounded-2xl p-2 md:p-14 w-full max-w-2xl mx-auto">
              {course ? (
                <div className="flex flex-col justify-center text-center items-center h-28 sm:h-32">
                  <span className="block sm:text-xl font-bold tracking-wider text-gray-500 sm:mb-1">
                    {course.code}
                  </span>
                  <span className="block text-balance text-xl sm:text-3xl md:text-4xl font-semibold tracking-tight leading-tight text-gray-800">
                    {course.name}
                  </span>
                </div>
              ) : (
                <div className="w-full mx-auto h-28 sm:h-32 rounded-xl bg-slate-200 animate-pulse"></div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
