"use client";

import { api } from "../../../../convex/_generated/api";
import { useState } from "react";
import {
  CheckIcon,
  ChevronUpDownIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useQuery } from "@/usingSession";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useIdentity } from "@/components/SessionProvider";
import { useCourseSlug } from "@/hooks/useCourseSlug";
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Transition,
} from "@headlessui/react";
import { TabBar } from "@/components/TabBar";
import Upload from "@/components/Upload";


import Title from "@/components/typography";


import { ExerciseLink } from "@/components/ExerciseLink";
import { DropdownMenu, DropdownMenuItem } from "@/components/DropdownMenu";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { Id } from "../../../../convex/_generated/dataModel";
import { useMutation } from "@/usingSession";
import { toast } from "sonner";
import Link from "next/link";

import { PlusIcon } from "@heroicons/react/20/solid";


type Exercise = {
  id: Id<"exercises">;
  name: string;
  image: {
    thumbnails: { type: string; sizes?: string; src: string }[];
  } | null;
};

type Week = {
  _id: Id<"weeks">;
  exercises: Exercise[];
  _creationTime: number;
  endDateExtraTime: number;
  cacheInvalidation?: number;
};




function Login() {
  const router = useRouter();
  const courseSlug = useCourseSlug();
  const user = useQuery(api.courses.getRegistration, { courseSlug });
  const identity = useIdentity();

  useEffect(() => {
    if (user === null) {
      router.push("/login");
    }
  }, [router, user]);

  if (!user) return null;

  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-col leading-snug text-gray-700">
        <p className="text-gray-800 font-semibold">
          {identity ? identity.name : user.name}
          {user.group && <span className="font-normal"> ({user.group})</span>}
        </p>
        <p>{identity ? identity.email : user.email}</p>
      </div>
    </div>
  );
}

function CourseSelector() {
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
    <>
      <Listbox
        value={courseSlug}
        onChange={(selectedCourseSlug) => {
          router.push(`/${selectedCourseSlug}`);
        }}
      >
        {({ open }) => (
          <>
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
                  <span className="block [text-wrap:balance] text-xl sm:text-3xl md:text-4xl font-semibold tracking-tight leading-tight text-gray-800 text-balance">
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
                              <CheckIcon
                                className="h-5 w-5"
                                aria-hidden="true"
                              />
                            </span>
                          ) : null}
                        </>
                      )}
                    </ListboxOption>
                  ))}

                  <hr />
                  <p className="py-2 px-5 text-gray-500">
                    If there is a course missing, please contact your
                    instructor.
                  </p>
                </ListboxOptions>
              </Transition>
            </div>
          </>
        )}
      </Listbox>
    </>
  );
}

function isDefined<T>(argument: T | false): argument is T {
  return argument !== false;
}

export default function CoursePage() {
  const courseSlug = useCourseSlug();
  const user = useQuery(api.courses.getRegistration, { courseSlug });
  const built = useQuery(api.admin.sadatabase.built, { courseSlug });

  return (
    <>
      <div className="bg-gradient-to-b from-purple-200 via-indigo-200 to-blue-200">
        <div className="p-6 sm:p-10 pb-0 sm:pb-0 flex justify-center">
          <div className="max-w-6xl flex-1">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
              <div className="flex-1 text-3xl tracking-tight font-medium select-none cursor-default my-2">
                explique.ai
              </div>
              <Login />
            </div>

            <div className="bg-white shadow-[0_-20px_40px_-12px_rgb(0_0_0_/_0.1)] rounded-t-2xl p-2 sm:p-8 md:p-14 w-full max-w-2xl mx-auto mt-8">
              <CourseSelector />
            </div>
          </div>
        </div>
      </div>
      <div className="relative p-6 sm:p-10 flex justify-center shadow-[0_-10px_10px_-3px_rgba(0_0_0_/_0.08)]">
        <div className="max-w-6xl flex-1">
          {user && (
            <TabBar
              items={[
                { label: "Super-Assistant", href: `/${courseSlug}/super-assistant` },
                { label: "Exercises", href: `/${courseSlug}` },
                user.isAdmin && {
                  label: "Admin",
                  href: `/${courseSlug}/admin`,
                },
                user.isSuperadmin && {
                  label: "Superadmin",
                  href: `/superadmin`,
                },
              ].filter(isDefined)}
            />
          )}

          {built ? <SuperAssistant /> : <NoSuperAssistant />}
          <div className="h-10" />
        </div>
      </div>
    </>
  );
}


function NoSuperAssistant() {
  return (
    <div className="flex h-full items-center justify-center" >
      <h2 className="font-medium text-3xl tracking-tight">
        There is no Super-Assistant available for this course.
      </h2>
    </div>
  );
}



function ExerciseLinkWithMenu({ feedback }: { feedback: Exercise }) {
  const courseSlug = useCourseSlug();
  const deleteExercise = useMutation(api.admin.exercises.softDelete);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [destinationCourse, setDestinationCourse] =
    useState<Id<"courses"> | null>(null);
  const [destinationWeek, setDestinationWeek] = useState<Id<"weeks"> | null>(
    null,
  );
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);

  return (
    <>
      <ExerciseLink
        href={`/${courseSlug}/admin/exercises/${feedback.id}`}
        name={feedback.name}
        image={feedback.image}
        corner={
          <div className="p-4">
            <div className="pointer-events-auto">
              <DropdownMenu variant="overlay">
                <DropdownMenuItem
                  onClick={() => {
                    setIsDeleteModalOpen(true);
                  }}
                  variant="danger"
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenu>
            </div>
          </div>
        }
      />
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title={`Delete “${feedback.name}”?`}
      >
        <div className="mt-2">
          <p className="text-sm text-gray-500">
            Are you sure that you want to delete this feedback{" "}
            <strong className="font-semibold text-gray-600">
              “{feedback.name}”
            </strong>
            ? This action cannot be undone.
          </p>
        </div>
        <div className="mt-4 flex gap-2 justify-end">
          <Button
            onClick={() => setIsDeleteModalOpen(false)}
            variant="secondary"
            size="sm"
          >
            Cancel
          </Button>
          <Button
            onClick={async () => {
              setIsDeleteModalOpen(false);
              await deleteExercise({
                id: feedback.id,
                courseSlug,
              });
              toast.success("Exercise deleted successfully");
            }}
            variant="danger"
            size="sm"
          >
            Delete
          </Button>
        </div>
      </Modal>
    </>
  );
}




// function SuperAssistant() {
//   const [file, setFile] = useState<File | null>(null);
//   const courseSlug = useCourseSlug();
//   const weeks = useQuery(api.admin.exercises.list, {
//     courseSlug,
//   }); // assuming weeks == our feedbacks
//   const [isModalOpen, setIsModalOpen] = useState(false);

//   const [destinationWeek, setDestinationWeek] = useState<Id<"exercises"> | null>(
//     null,
//   );

//   return (
//     <>
//       <Title>
//         <span className="flex-1">Welcome to the super-assistant</span>
//       </Title>
//       <div>
//         <h2 className="text-3xl font-medium flex mb-4 gap-3 flex-wrap items-center">
//           <div className="flex-1">
//             <div className="mt-4 grid gap-6 md:grid-cols-2">
//             {weeks?.map((week: Week) =>
//                  week.exercises.map((exercise: Exercise) => (
//                   <ExerciseLinkWithMenu feedback={exercise} key={exercise.id} />
//                 ))
//               )}
              
//               {/* Change this to a modal */}
//               {/* <Link
//                 href={`/${courseSlug}/admin/exercises/new/${weeks._id}`}
//                 className="block rounded-3xl shadow-[inset_0_0_0_2px_#bfdbfe] transition-shadow hover:shadow-[inset_0_0_0_2px_#0084c7]"
//               >
//                 <div className="relative pb-[57.14%]">
//                   <div className="absolute inset-0 flex flex-col items-center justify-center text-sky-700 text-xl gap-2">
//                     <PlusIcon className="w-6 h-6" />
//                     <span>Create a new Feedback</span>
//                   </div>
//                 </div>
//               </Link> */}
//                <div className="relative pb-[57.14%]">
//                   <div className="absolute inset-0 flex flex-col items-center justify-center text-sky-700 text-xl gap-2">
//                   <button
//                     className="flex [&>svg]:w-6 [&>svg]:h-6 [&>svg]:mr-2 items-center h-12 px-4 transition-colors rounded-full hover:bg-slate-200 hover:text-slate-800 font-medium [&>svg]:transition-colors"
//                     type="button"
//                     onClick={() => { setIsModalOpen(true); }}
//                     >
//                     <PlusIcon className="w-6 h-6" />
//                     <span>Create a new Feedback</span>
                      
//                   </button>
//                   <Modal
//                     isOpen={isModalOpen}
//                     onClose={() => setIsModalOpen(false)}
//                     title="Upload a new file to the knowledge database."
//                   >
//                     <form>
//                     {/* <form
//                       onSubmit={async (e) => {
//                         e.preventDefault();
//                         if (file === null) return;
//                         const weekNumber = (week === "" ? -1 : Number(week));
//                         const storageIds = await handleUploadFile();
//                         setFile(null);
//                         const worked = await uploadFile({ courseSlug:courseSlug, week:(!isNaN(weekNumber) && weekNumber >= 0 ? weekNumber : -1), name:file?file.name:"", storageIds:storageIds });
//                         if (!worked) {
//                           toast.error("A file with this name already exists.");
//                         } else {
//                           toast.success("The file has been uploaded. Thank you!");
//                           setIsModalOpen(false);
//                           setWeek("");
//                         }
//                       }}
//                     > */}
//                       <Upload
//                         value={file}
//                         onChange={(value) => setFile(value)}
//                       />
//                       {/* <Input
//                         label="Specify a name (optional):"
//                         placeholder="Name number"
//                         value={name}
//                         onChange={(value) => setName(name)}
//                       /> */}
//                       <div className="flex justify-end gap-2">
//                         <Button
//                           type="button"
//                           onClick={() => {
//                             // setIsModalOpen(false);
//                             // setWeek("");
//                             setFile(null);
//                           }}
//                           variant="secondary"
//                           size="sm"
//                         >
//                           Cancel
//                         </Button>
//                         <Button type="submit" size="sm">
//                           Add file
//                         </Button>
//                       </div>
//                     </form>
//                   </Modal>
//                     <PlusIcon className="w-6 h-6" />
//                     <span>Create a new Feedback</span>
//                   </div>
//                 </div>
//             </div>
//           </div>
//           <div className="w-1 bg-gray-400"></div>
//           <div className="flex-1"></div>
//         </h2>
//       </div>
//       {/* <Upload value={file} onChange={(value) => setFile(value)} /> */}
//     </>
//   );
// }

function SuperAssistant() {
  const [file, setFile] = useState<File | null>(null);
  const courseSlug = useCourseSlug();
  const weeks = useQuery(api.admin.exercises.list, { courseSlug });
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [destinationWeek, setDestinationWeek] = useState<Id<"exercises"> | null>(
    null,
  );

  if (!weeks) return <div>Loading...</div>;

  return (
    <>
      <Title>
        <span className="flex-1">Welcome to the super-assistant</span>
      </Title>
      <div>
        <h2 className="text-3xl font-medium flex mb-4 gap-3 flex-wrap items-center">
          <div className="flex-1">
          <span className="flex-1 text-xl">Get feedback</span>
            <div className="mt-4 grid gap-6 md:grid-cols-2">
              {weeks.map((week: Week) =>
                week.exercises.map((exercise: Exercise) => (
                  <ExerciseLinkWithMenu feedback={exercise} key={exercise.id} />
                ))
              )}

            <div className="relative pb-[57.14%]">
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-sky-700 text-xl gap-2">
                    <button
                      className="flex items-center h-full px-4 transition-colors rounded-full hover:bg-slate-200 hover:text-slate-800 font-medium"
                      type="button"
                      onClick={() => { setIsModalOpen(true); }}
                    >
                      <PlusIcon className="w-6 h-6 mr-2" />
                      <span>Get feedback on an exercise</span>
                    </button>
                  </div>
                </div>
            </div>
          </div>
  
          <div className="w-1 bg-gray-400 h-auto self-stretch"></div>

          <div className="flex-1">
          <span className="flex-1 text-xl">Still stuck ? Go to the super-assistant</span>
            <div className="mt-4 grid gap-6 md:grid-cols-2">
                {weeks.map((week: Week) =>
                  week.exercises.map((exercise: Exercise) => (
                    <ExerciseLinkWithMenu feedback={exercise} key={exercise.id} />
                  ))
                )}
                <div className="relative pb-[57.14%]">
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-sky-700 text-xl gap-2">
                    <button
                      className="flex items-center h-full px-4 transition-colors rounded-full hover:bg-slate-200 hover:text-slate-800 font-medium"
                      type="button"
                      onClick={() => { setIsModalOpen(true); }}
                    >
                      <PlusIcon className="w-6 h-6 mr-2" />
                      <span>Go directly to chat</span>
                    </button>
                  </div>
                </div>
              </div>
          </div>
        </h2>
      </div>


      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Upload your attempting solution."
      >
        {/* <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (file === null) return;
            setIsModalOpen(false);
            const weekNumber = (week === "" ? -1 : Number(week));
            const storageIds = await handleUploadFile();
            setWeek("");
            setFile(null);
            await uploadFile({ courseSlug:courseSlug, week:(!isNaN(weekNumber) && weekNumber >= 0 ? weekNumber : -1), name:file?file.name:"", storageIds:storageIds });
            toast.success("The file has been uploaded. Thank you!");
          }}
        > */}
        <form>
          <Upload
            value={file}
            onChange={(value) => setFile(value)}
          />
          {/* <Input
            label="Specify week (optional):"
            placeholder="Week number"
            value={week}
            onChange={(value) => setWeek(value)}
          /> */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                //setWeek("");
                setFile(null);
              }}
              variant="secondary"
              size="sm"
            >
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Add file
            </Button>
          </div>
        </form>
      </Modal>

    </>
  );
}
