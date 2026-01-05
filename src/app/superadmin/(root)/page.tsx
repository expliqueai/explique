"use client"

import { Button } from "@/components/Button"
import Title from "@/components/typography"
import { useMutation, useQuery } from "@/usingSession"
import { PlusIcon } from "@heroicons/react/20/solid"
import { useRouter } from "next/navigation"
import { api } from "../../../../convex/_generated/api"

export default function SuperadminCoursesPage() {
  const router = useRouter()
  const courses = useQuery(api.superadmin.courses.list, {})
  const registerToCourse = useMutation(api.superadmin.courses.register)

  async function handleCourseAccess(courseId: string, courseSlug: string) {
    // Automatically register superadmin to the course if not already registered
    await registerToCourse({ courseId })
    router.push("/" + courseSlug)
  }

  return (
    <>
      <Title>
        <div className="flex-1">Courses</div>
        <Button href="/superadmin/add">
          <PlusIcon className="h-5 w-5" />
          Add Course
        </Button>
      </Title>

      <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
          {courses !== undefined ? (
            <div className="ring-opacity-5 overflow-hidden shadow-sm ring-1 ring-black sm:rounded-lg">
              <table className="min-w-full divide-y divide-slate-300">
                <thead className="bg-slate-50">
                  <tr>
                    <th
                      scope="col"
                      className="py-3.5 pr-3 pl-4 text-left text-sm font-semibold text-slate-900 sm:pl-6"
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
                      className="relative py-3.5 pr-4 pl-3 sm:pr-6"
                    >
                      <span className="sr-only">View</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {courses?.map((course) => (
                    <tr key={course.id}>
                      <td className="py-4 pr-3 pl-4 text-sm font-medium whitespace-nowrap text-slate-900 tabular-nums sm:pl-6">
                        {course.code}
                      </td>
                      <td className="px-3 py-4 text-sm whitespace-nowrap text-slate-500">
                        {course.name}
                      </td>
                      <td className="relative py-4 pr-4 pl-3 text-right text-sm font-medium whitespace-nowrap sm:pr-6">
                        <button
                          onClick={() =>
                            handleCourseAccess(course.id, course.slug)
                          }
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View<span className="sr-only">, {course.name}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-96 animate-pulse rounded-lg bg-slate-200"></div>
          )}
        </div>
      </div>
    </>
  )
}
