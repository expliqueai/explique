"use client";

import Title from "@/components/typography";
import { useQuery } from "@/usingSession";
import { api } from "../../../../convex/_generated/api";
import { PlusIcon } from "@heroicons/react/20/solid";
import { Button } from "@/components/Button";

export default function SuperadminCoursesPage() {
  const courses = useQuery(api.superadmin.courses.list, {});

  return (
    <>
      <Title>
        <div className="flex-1">Courses</div>
        <Button href="/superadmin/add">
          <PlusIcon className="w-5 h-5" />
          Add Course
        </Button>
      </Title>

      <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
          {courses !== undefined ? (
            <div className="overflow-hidden shadow-sm ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              <table className="min-w-full divide-y divide-slate-300">
                <thead className="bg-slate-50">
                  <tr>
                    <th
                      scope="col"
                      className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-slate-900 sm:pl-6"
                    >
                      Code
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-slate-900"
                    >
                      Title
                    </th>
                    <th
                      scope="col"
                      className="relative py-3.5 pl-3 pr-4 sm:pr-6"
                    >
                      <span className="sr-only">View</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {courses?.map((course) => (
                    <tr key={course.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-slate-900 sm:pl-6 tabular-nums">
                        {course.code}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                        {course.name}
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <a
                          href={`/${course.slug}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View<span className="sr-only">, {course.name}</span>
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-96 bg-slate-200 animate-pulse rounded-lg"></div>
          )}
        </div>
      </div>
    </>
  );
}
