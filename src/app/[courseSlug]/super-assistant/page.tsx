"use client";

import { api } from "../../../../convex/_generated/api";
import { useState } from "react";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useQuery } from "@/usingSession";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useIdentity } from "@/components/SessionProvider";
import { useCourseSlug } from "@/hooks/useCourseSlug";
import { Listbox, ListboxButton, ListboxOption, ListboxOptions, Transition } from "@headlessui/react";
import { TabBar } from "@/components/TabBar";
import Upload from "@/components/Upload";
import Title from "@/components/typography";
import { FeedbackLink } from "@/components/super-assistant/FeedbackLink";
import { ChatLink } from "@/components/super-assistant/ChatLink";
import { DropdownMenu, DropdownMenuItem } from "@/components/DropdownMenu";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { Id } from "../../../../convex/_generated/dataModel";
import { useMutation } from "@/usingSession";
import { toast } from "sonner";
import { PlusIcon } from "@heroicons/react/20/solid";
import { useUploadFiles } from "@xixixao/uploadstuff/react";
import { formatTimestampHumanFormat } from "@/util/date";
import Input from "@/components/Input";



type Feedback = { 
  id : Id<"feedbacks">;
  creationTime: number;
  status: "chat" | "feedback";
  image: Id<"_storage">;
}


type Chat = {
  id: Id<"chats">;
  creationTime: number;
  name: string | undefined;
}


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

export default function SuperAssistantPage() {
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

          {built === undefined ? <LoadingGrid /> : built ? <SuperAssistant /> : <NoSuperAssistant />}
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


function Feedback({ feedback }: { feedback: Feedback }) {
  const courseSlug = useCourseSlug();
  const deleteFeedback = useMutation(api.feedback.deleteFeedback);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const imageUrl = useQuery(api.feedback.getImage, { feedbackId:feedback.id });

  return (
    <>
      <FeedbackLink
        href={`/${courseSlug}/super-assistant/feedback/${feedback.id}`}
        name= {formatTimestampHumanFormat(feedback.creationTime)}
        image= {imageUrl}
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
        title={`Delete “feedback”?`}
      >
        <div className="mt-2">
          <p className="text-sm text-gray-500">
            Are you sure that you want to delete this feedback{" "}
            <strong className="font-semibold text-gray-600">
              “feedback”
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
              deleteFeedback({id : feedback.id, courseSlug : courseSlug});
              toast.success("Feedback deleted successfully");
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
};


function Chat({ chat }: { chat: Chat }) {
  const courseSlug = useCourseSlug();
  const deleteChat = useMutation(api.feedback.deleteChat);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  return (
    <>
      <ChatLink
        href={`/${courseSlug}/super-assistant/chat/${chat.id}`}
        name= {chat.name ? chat.name : formatTimestampHumanFormat(chat.creationTime)}
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
        title={`Delete “chat”?`}
      >
        <div className="mt-2">
          <p className="text-sm text-gray-500">
            Are you sure that you want to delete this chat{" "}
            <strong className="font-semibold text-gray-600">
              “chat”
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
              deleteChat({id : chat.id, courseSlug : courseSlug});
              toast.success("Chat deleted successfully");
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
};



function SuperAssistant() {
  const [file, setFile] = useState<File | null>(null);
  const courseSlug = useCourseSlug();
  const feedbacks = useQuery(api.feedback.list, { courseSlug });
  const chats = useQuery(api.sachat.list, { courseSlug });
  const [isModal1Open, setIsModal1Open] = useState(false);
  const [isModal2Open, setIsModal2Open] = useState(false);
  const [chatName, setChatName] = useState("");
  const [statement, setStatement] = useState("");
  const router = useRouter();
  const generateFeedback = useMutation(api.feedback.generateFeedback);
  const generateUploadUrl = useMutation(api.feedback.generateUploadUrl);
  const { startUpload } = useUploadFiles(generateUploadUrl);
  const generateChat = useMutation(api.sachat.generateChat);
  
  return (
    <>
      <Title>
        <span className="flex-1">Welcome to the Super-Assistant!</span>
      </Title>
      <div>
        <h2 className="text-3xl font-medium flex mb-4 gap-3 flex-wrap items-start">
          <div className="flex-1">
            <span className="flex-1 text-xl">Get feedback on an exercise</span>
            <div className="mt-4 grid gap-6 md:grid-cols-2">
              <button
                className="block rounded-3xl shadow-[inset_0_0_0_2px_#bfdbfe] transition-shadow hover:shadow-[inset_0_0_0_2px_#0084c7]"
                type="button"
                onClick={() => { setIsModal1Open(true); }}
              >
                <div className="relative pb-[57.14%]">
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-sky-700 text-xl gap-2">
                    <PlusIcon className="w-6 h-6 mb-2" />
                    <span>New feedback</span>
                  </div>
                </div>
              </button>
              {feedbacks?.map(feedback => (
                <Feedback feedback={feedback} key={feedback.id} />
              ))}
            </div>
          </div>

          <div className="w-1 bg-gray-400 h-auto self-stretch"></div>

          <div className="flex-1">
            <span className="flex-1 text-xl">Still stuck? Chat with the Super-Assistant</span>
            <div className="mt-4 grid gap-6 md:grid-cols-2">
              <button
                className="block rounded-3xl shadow-[inset_0_0_0_2px_#bfdbfe] transition-shadow hover:shadow-[inset_0_0_0_2px_#0084c7]"
                type="button"
                onClick={() => { setIsModal2Open(true); }}
              >
                <div className="relative pb-[57.14%]">
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-sky-700 text-xl gap-2">
                    <PlusIcon className="w-6 h-6 mb-2" />
                    <span>New chat</span>
                  </div>
                </div>
              </button>
              {chats?.map(chat => (
                <Chat chat={chat} key={chat.id} />
              ))}
            </div>
          </div>
        </h2>
      </div>

      <Modal
        isOpen={isModal1Open}
        onClose={() => setIsModal1Open(false)}
        title="Upload your tentative solution."
      >
        <form onSubmit={
          async (e) => {
            e.preventDefault();
            if (file === null) return;
            const uploaded = await startUpload([file]);
            const storageId = uploaded.map(({response}) => ((response as any).storageId))[0];
            const feedbackId = await generateFeedback({ courseSlug, storageId:storageId });

            if (feedbackId) {
              router.push(`/${courseSlug}/super-assistant/feedback/${feedbackId}`);
              toast.success("Your solution has been uploaded. Please wait for it to be reviewed.");
            } else {
              toast.error("Failed to generate feedback.");
            }

            setIsModal1Open(false);
          }
        }>
          <Upload
            value={file}
            onChange={(value) => setFile(value)}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              onClick={() => {
                setIsModal1Open(false);
                setFile(null);
              }}
              variant="secondary"
              size="sm"
            >
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Generate feedback
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isModal2Open}
        onClose={() => setIsModal2Open(false)}
        title="Start a chat with the Super-Assistant."
      >
        <form onSubmit={
          async (e) => {
            e.preventDefault();
            const chatId = await generateChat({ courseSlug, reason:statement, name:chatName });

            if (chatId) {
              router.push(`/${courseSlug}/super-assistant/chat/${chatId}`);
              toast.success("A new chat is being generated, please wait.");
            } else {
              toast.error("Failed to generate chat.");
            }

            setIsModal2Open(false);
          }
        }>
          <div className="h-6"></div>
          <Input
            label="Name this new chat (optional):"
            placeholder="Name"
            value={chatName}
            onChange={(value) => setChatName(value)}
          />
          <Input
            label="Specify the exercise and what clarification you need:"
            placeholder="Reason for new chat"
            value={statement}
            onChange={(value) => setStatement(value)}
            required
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              onClick={() => {
                setIsModal2Open(false);
                setChatName("");
                setStatement("");
              }}
              variant="secondary"
              size="sm"
            >
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Generate new chat
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

function LoadingGrid() {
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