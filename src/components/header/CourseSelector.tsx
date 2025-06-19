import { useCourseSlug } from "@/hooks/useCourseSlug";
import {
  Listbox,
  ListboxButton,
  Transition,
  ListboxOptions,
  ListboxOption,
} from "@headlessui/react";
import { ChevronUpDownIcon, CheckIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useQuery } from "@/usingSession";
import { useRouter } from "next/navigation";
import { api } from "../../../convex/_generated/api";

export default function CourseSelector() {
  const router = useRouter();

  const courseSlug = useCourseSlug();
  const user = useQuery(api.courses.getRegistration, { courseSlug });
  const courses = useQuery(api.courses.getMyRegistrations, {});

  if (!user || !courses) {
    return (
      <div className="w-full mx-auto h-28 sm:h-32 rounded-xl bg-slate-200 animate-pulse"></div>
    );
  }

  return (
    <Listbox
      value={courseSlug}
      onChange={(selectedCourseSlug) => {
        router.push(`/${selectedCourseSlug}`);
      }}
    >
      {({ open }) => (
        <div className="relative">
          <ListboxButton
            className={clsx(
              "w-full cursor-default rounded-2xl py-1.5 px-6 sm:px-10 text-left text-gray-900 ring-inset focus:outline-none focus:ring-4 sm:text-sm sm:leading-6 h-28 sm:h-32",
              open && "ring-4",
            )}
          >
            <h1 className="flex flex-col justify-center text-center items-center">
              <span className="block sm:text-xl font-bold tracking-wider text-gray-500 sm:mb-1">
                {user.course.code}
              </span>
              <span className="block text-xl sm:text-3xl md:text-4xl font-semibold tracking-tight leading-tight text-gray-800 text-balance">
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
            <ListboxOptions className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
              {courses.map((course) => (
                <ListboxOption
                  key={course.slug}
                  className={({ focus }) =>
                    clsx(
                      focus ? "bg-purple-600 text-white" : "",
                      !focus ? "text-gray-900" : "",
                      "relative cursor-default select-none py-2 pl-9 pr-4",
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
                            "ml-2 truncate tabular-nums",
                          )}
                        >
                          {course.code}
                        </span>
                        <span
                          className={clsx(
                            selected ? "font-semibold" : "font-normal",
                            "truncate",
                          )}
                        >
                          {course.name}
                        </span>
                      </div>

                      {selected ? (
                        <span
                          className={clsx(
                            focus ? "text-white" : "text-indigo-600",
                            "absolute inset-y-0 left-0 flex items-center pl-4",
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
              <p className="py-2 px-5 text-gray-500">
                If there is a course missing, please contact your instructor.
              </p>
            </ListboxOptions>
          </Transition>
        </div>
      )}
    </Listbox>
  );
}
