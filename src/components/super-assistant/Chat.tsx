import { Fragment, useEffect, useRef, useState } from "react";
import {
  ArrowUpTrayIcon,
  HandThumbDownIcon,
  PaperAirplaneIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useMutation, useQuery } from "@/usingSession";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import Markdown from "../Markdown";
import Input from "../Input";
import { Button } from "../Button";
import { Modal } from "@/components/Modal";
import { toast } from "sonner";
import { useFileUpload } from "@/hooks/useFileUpload";
import UploadWithImage from "@/components/UploadWithImage";
import { Dialog, Transition } from "@headlessui/react";


export default function Chat({ chatId }: { chatId: Id<"saAttempts"> }) {
  const chat = useQuery(api.superassistant.messages.list, { attemptId: chatId });
  const imageUrl = useQuery(api.superassistant.attempt.getImage, { attemptId: chatId });
  const statement = useQuery(api.superassistant.attempt.getStatement, { attemptId: chatId });

  useEffect(() => {
    setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    }, 0);
  }, [chat]);

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="mt-4 mb-8 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-800">
          <Markdown text={statement || ""} />
        </div>

        {imageUrl !== null && imageUrl !== undefined && (
          <ImageMessage imageUrl={imageUrl} />
        )}

        {chat?.map((message, i) => (
          <Fragment key={(message).id ?? (message).id ?? i}>
            {typeof message.content !== "string" &&
              message.role === "user" &&
              message.content[1].type === "image_url" && (
                <>
                  <div className="flex-row-full flex w-full items-center justify-items-center p-4 text-center text-lg font-bold text-purple-500">
                    <div className="w-1/3 items-center">
                      <div className="h-0.5 w-auto self-stretch bg-purple-500 px-2"></div>
                    </div>
                    <p className="w-1/3 px-2">New attempt</p>
                    <div className="w-1/3 items-center">
                      <div className="h-0.5 w-auto self-stretch bg-purple-500 px-2"></div>
                    </div>
                  </div>
                  <ImageMessage imageUrl={message.content[1].image_url.url} />
                </>
              )
            }

            {typeof message.content === "string" &&
              (message.role === "assistant" || message.role === "user") && (
                <div key={message.id}>
                  <div
                    className={clsx(
                      "flex",
                      message.role === "assistant" && "mr-6",
                      message.role === "user" && "ml-6"
                    )}
                  >
                    <div
                      className={clsx(
                        "relative inline-block rounded-xl p-3 shadow sm:p-4",
                        message.role === "assistant" &&
                          "rounded-bl-none bg-white",
                        message.role === "user" &&
                          "ml-auto rounded-br-none bg-gradient-to-b from-purple-500 to-purple-600 text-white"
                      )}
                    >
                      {message.role === "assistant" ? (
                        message.appearance === "typing" ? (
                          <div className="flex gap-1" aria-label="Loading">
                            <div className="h-2 w-2 animate-pulse rounded-full bg-slate-500"></div>
                            <div className="animation-delay-1-3 h-2 w-2 animate-pulse rounded-full bg-slate-500"></div>
                            <div className="animation-delay-2-3 h-2 w-2 animate-pulse rounded-full bg-slate-500"></div>
                          </div>
                        ) : message.appearance === "error" ? (
                          <div>
                            <p className="flex items-center justify-center gap-1 font-light">
                              <ExclamationCircleIcon
                                className="h-6 w-6 text-red-600"
                                aria-hidden="true"
                              />
                              <span className="flex-1">
                                <strong className="font-medium text-red-600">
                                  An error occurred.
                                </strong>{" "}
                                Please try again.
                              </span>
                            </p>
                          </div>
                        ) : (
                          <>
                            <Markdown text={message.content} />
                            <ReportMessage
                              messageId={message.id}
                              isReported={message.isReported}
                            />
                          </>
                        )
                      ) : (
                        <>
                          {message.role === "user" && (
                            <p className="prose prose-sm sm:prose-base whitespace-pre-wrap text-white">
                              {message.content}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            }
          </Fragment>
        ))}
      </div>

      <NewMessage chatId={chatId} />
    </>
  );
}

function ReportMessage({
  messageId,
  isReported,
}: {
  messageId: Id<"saMessages">;
  isReported: boolean;
}) {
  const reportMessage = useMutation(api.superassistant.messages.reportMessage);
  const unreportMessage = useMutation(api.superassistant.messages.unreportMessage);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reason, setReason] = useState("");

  return (
    <>
      <div className="flex items-center justify-end box-content p-1">
        <button
          className={clsx(
            "w-8 h-8 rounded-full flex items-center justify-center shadow-md absolute bottom-0 -right-10",
            isReported && "bg-purple-600 text-white",
            !isReported && "bg-white text-purple-600",
          )}
          type="button"
          title="Report"
          onClick={async (e) => {
            e.preventDefault();
            if (isReported) {
              await unreportMessage({ messageId });
              toast.success("Your message report has been removed.");
            } else {
              setIsModalOpen(true);
            }
          }}
        >
          <HandThumbDownIcon className="w-5 h-5" />
        </button>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Why are you reporting this message?"
      >
        <form
          className="mt-5"
          onSubmit={async (e) => {
            e.preventDefault();
            if (reason.trim()) {
              setIsModalOpen(false);
              setReason("");
              await reportMessage({ messageId, reason });
              toast.success("The message has been reported. Thank you!");
            }
          }}
        >
          <Input
            label=""
            placeholder="Report reason"
            value={reason}
            onChange={(value) => setReason(value)}
            required
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                setReason("");
              }}
              variant="secondary"
              size="sm"
            >
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Report Message
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

function NewMessage({
  chatId,
}: {
  chatId: Id<"saAttempts">
}) {
  const sendMessage = useMutation(api.superassistant.messages.sendMessage)
  const [message, setMessage] = useState("")
  const [isNewAttemptModalOpen, setIsNewAttemptModalOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const generateUploadUrl = useMutation(api.superassistant.attempt.generateUploadUrl)
  const { startUpload } = useFileUpload(() => generateUploadUrl({}))
  const updateFeedback = useMutation(api.superassistant.attempt.updateAttemptInChat)

  function autoResizeTextarea() {
    if (!textareaRef.current || !paddingRef.current) return

    const isDocumentScrolledToBottom =
      window.innerHeight + window.scrollY >= document.body.scrollHeight

    textareaRef.current.style.height = "0"
    const newHeight = Math.min(500, textareaRef.current.scrollHeight) + "px"
    textareaRef.current.style.height = newHeight
    paddingRef.current.style.height = newHeight

    if (isDocumentScrolledToBottom) {
      window.scrollTo({ top: document.body.scrollHeight })
    }
  }

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    window.addEventListener("resize", autoResizeTextarea)
    return () => window.removeEventListener("resize", autoResizeTextarea)
  })

  const paddingRef = useRef<HTMLDivElement>(null)

  function send() {
    const messageSent = message.trim()
    if (!messageSent) return
    sendMessage({ attemptId: chatId, message: messageSent })
    setMessage("")
    setTimeout(() => {
      autoResizeTextarea()
    }, 0)
  }

  return (
    <>
      <div className="box-content h-[60px] pt-4" ref={paddingRef} />
      <form
        className="fixed bottom-2 left-2 flex w-[calc(100%-1rem)] rounded-xl shadow-xl"
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
      >
        <div className="absolute inset-y-0 left-0 flex items-center px-2">
          <button
            className="flex h-12 w-12 items-center justify-center rounded-full bg-transparent text-slate-500 hover:bg-slate-200 hover:text-slate-600"
            type="button"
            title="Upload new attempt"
            onClick={(e) => {
              e.preventDefault()
              setIsNewAttemptModalOpen(true)
            }}
          >
            <ArrowUpTrayIcon className="h-6 w-6" />
          </button>
        </div>
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="h-[60px] w-full resize-none rounded-xl bg-transparent bg-white px-4 py-4 pr-16 pl-16 sm:text-lg"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
          onInput={() => {
            autoResizeTextarea()
          }}
        />
        <div className="absolute inset-y-0 right-0 flex items-center px-2">
          <button
            className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-600 text-white shadow-md"
            type="submit"
            title="Send"
          >
            <PaperAirplaneIcon className="h-6 w-6" />
          </button>
        </div>
      </form>

      <Modal
        isOpen={isNewAttemptModalOpen}
        onClose={() => setIsNewAttemptModalOpen(false)}
        title="Upload a new attempt to get feedback."
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            if (file === null) {
              toast.error(
                "You have to upload a tentative solution to get feedback."
              )
            }

            else if (!["image/png", "image/jpeg"].includes(file.type)) {
              toast.error("Only PNG and JPG/JPEG images are allowed.");
            }

            else {
              const uploaded = await startUpload([file])
              const storageId = (uploaded[0].response as { storageId: string })
                .storageId
              await updateFeedback({
                storageId: storageId as Id<"_storage">,
                attemptId: chatId,
              })
              setFile(null)
              setIsNewAttemptModalOpen(false)
            }
          }}
        > <div>Your file must have an image type.</div>
          <UploadWithImage value={file} onChange={(value) => setFile(value)} />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              onClick={() => {
                setIsNewAttemptModalOpen(false)
                setFile(null)
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
    </>
  )
}

function ImageMessage({ imageUrl }: { imageUrl: string }) {
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)

  return (
    <>
      <div className="ml-6 flex">
        <div className="ml-auto max-w-sm">
          <picture
            className="hover:cursor-pointer"
            onClick={(e) => {
              e.preventDefault()
              setIsImageModalOpen(true)
            }}
          >
            <img
              className="relative rounded-xl rounded-br-none shadow"
              src={imageUrl}
              alt={""}
            />
          </picture>
        </div>
      </div>

      <Transition appear show={isImageModalOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-10"
          onClose={() => setIsImageModalOpen(false)}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="max-h-screen-md max-w-screen-md transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-xl transition-all">
                  <picture>
                    <img className="" src={imageUrl} alt={""} />
                  </picture>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  )
}