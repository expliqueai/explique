import { useCourseSlug } from "@/hooks/useCourseSlug"
import { useQuery } from "@/usingSession"
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Transition,
} from "@headlessui/react"
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/24/outline"
import clsx from "clsx"
import { useRouter } from "next/navigation"
import { api } from "../../../convex/_generated/api"

export default function CourseSelector() {
  const router = useRouter()

  const courseSlug = useCourseSlug()
  const user = useQuery(api.courses.getRegistration, { courseSlug })
  const courses = useQuery(api.courses.getMyRegistrations, {})

  if (!user || !courses) {
    return (
      <div className="mx-auto h-28 w-full animate-pulse rounded-xl bg-slate-200 sm:h-32"></div>
    )
  }

  return (
    <Listbox
      value={courseSlug}
      onChange={(selectedCourseSlug) => {
        router.push(`/${selectedCourseSlug}`)
      }}
    >
      {({ open }) => (
        <div className="relative">
          <ListboxButton className="h-28 w-full rounded-2xl px-6 py-1.5 text-left text-gray-900 sm:h-32 sm:px-10 sm:text-sm sm:leading-6">
            <h1 className="flex flex-col items-center justify-center text-center">
              <span className="block font-bold tracking-wider text-gray-500 sm:mb-1 sm:text-xl">
                {user.course.code}
              </span>
              <span className="block text-xl leading-9 font-semibold tracking-tight text-balance text-gray-800 sm:text-3xl md:text-4xl">
                {user.course.name}
              </span>
            </h1>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center sm:pr-2">
              <ChevronUpDownIcon
                className="h-6 w-6 text-gray-400"
                aria-hidden="true"
              />
            </span>
          </ListboxButton>

          <Transition
            show={open}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <ListboxOptions className="absolute z-30 mt-4 max-h-60 w-full overflow-auto rounded-md border bg-white py-1 text-base shadow-lg sm:text-sm">
              {courses.map((course) => (
                <ListboxOption
                  key={course.slug}
                  className={({ focus }) =>
                    clsx(
                      focus ? "bg-purple-600 text-white" : "",
                      !focus ? "text-gray-900" : "",
                      "relative py-2 pr-4 pl-9 select-none"
                    )
                  }
                  value={course.slug}
                >
                  {({ selected, focus }) => (
                    <>
                      <div className="flex gap-2">
                        <span
                          className={clsx(
                            focus ? "text-purple-200" : "text-gray-500",
                            "ml-2 truncate tabular-nums"
                          )}
                        >
                          {course.code}
                        </span>
                        <span
                          className={clsx(
                            selected ? "font-semibold" : "font-normal",
                            "truncate"
                          )}
                        >
                          {course.name}
                        </span>
                      </div>

                      {selected ? (
                        <span
                          className={clsx(
                            focus ? "text-white" : "text-indigo-600",
                            "absolute inset-y-0 left-0 flex items-center pl-4"
                          )}
                        >
                          <CheckIcon className="h-5 w-5" aria-hidden="true" />
                        </span>
                      ) : null}
                    </>
                  )}
                </ListboxOption>
              ))}

              <hr />
              <p className="px-5 py-2 text-gray-500">
                If there is a course missing, please contact your instructor.
              </p>
            </ListboxOptions>
          </Transition>
        </div>
      )}
    </Listbox>
  )
}
