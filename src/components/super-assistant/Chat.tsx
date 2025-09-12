import { useEffect, useRef, useState } from "react";
import {
  HandThumbDownIcon,
  PaperAirplaneIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { ExclamationCircleIcon } from "@heroicons/react/24/outline";
import { useMutation, useQuery } from "@/usingSession";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import Markdown from "../Markdown";
import Input from "../Input";
import { Button } from "../Button";
import { Modal } from "@/components/Modal";
import { toast } from "sonner";

export default function Chat({ chatId }: { chatId: Id<"chats"> }) {
  const chat = useQuery(api.superassistant.chatmessages.list, { chatId });

  useEffect(() => {
    setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    }, 0);
  }, [chat]);

  return (
    <>
      <div className="flex flex-col gap-6">
        {chat?.map((message) => (
          <>
            {typeof message.content === "string" && (
              <div key={message.id}>
                <div
                  className={clsx(
                    "flex",
                    message.assistant && "mr-6",
                    !message.assistant && "ml-6",
                  )}
                >
                  <div
                    className={clsx(
                      "inline-block p-3 sm:p-4 rounded-xl shadow relative",
                      message.assistant && "bg-white rounded-bl-none",
                      !message.assistant &&
                        "bg-gradient-to-b from-purple-500 to-purple-600 text-white rounded-br-none ml-auto",
                    )}
                  >
                    {message.assistant ? (
                      message.appearance === "typing" ? (
                        <div className="flex gap-1" aria-label="Loading">
                          <div className="w-2 h-2 rounded-full bg-slate-500 animate-pulse"></div>
                          <div className="w-2 h-2 rounded-full bg-slate-500 animate-pulse animation-delay-1-3"></div>
                          <div className="w-2 h-2 rounded-full bg-slate-500 animate-pulse animation-delay-2-3"></div>
                        </div>
                      ) : message.appearance === "error" ? (
                        <div>
                          <p className="font-light flex items-center justify-center gap-1">
                            <ExclamationCircleIcon
                              className="w-6 h-6 text-red-600"
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
                        {!message.assistant && (
                          <p className="prose prose-sm sm:prose-base text-white whitespace-pre-wrap">
                            {message.content}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
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
  messageId: Id<"chatMessages">;
  isReported: boolean;
}) {
  const reportMessage = useMutation(api.superassistant.chatmessages.reportMessage);
  const unreportMessage = useMutation(api.superassistant.chatmessages.unreportMessage);
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

function NewMessage({ chatId }: { chatId: Id<"chats"> }) {
  const sendMessage = useMutation(api.superassistant.chatmessages.sendMessage);
  const [message, setMessage] = useState("");

  function autoResizeTextarea() {
    if (!textareaRef.current || !paddingRef.current) return;

    const isDocumentScrolledToBottom =
      window.innerHeight + window.scrollY >= document.body.scrollHeight;

    textareaRef.current.style.height = "0";
    const newHeight = Math.min(500, textareaRef.current.scrollHeight) + "px";
    textareaRef.current.style.height = newHeight;
    paddingRef.current.style.height = newHeight;

    if (isDocumentScrolledToBottom) {
      window.scrollTo({ top: document.body.scrollHeight });
    }
  }

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    window.addEventListener("resize", autoResizeTextarea);
    return () => window.removeEventListener("resize", autoResizeTextarea);
  });

  const paddingRef = useRef<HTMLDivElement>(null);

  function send() {
    const messageSent = message.trim();
    if (!messageSent) return;
    sendMessage({ chatId, message: messageSent });
    setMessage("");
    setTimeout(() => {
      autoResizeTextarea();
    }, 0);
  }

  return (
    <>
      <div className="box-content h-[60px] pt-4" ref={paddingRef} />
      <form
        className="fixed bottom-2 left-2 flex w-[calc(100%-1rem)] shadow-xl rounded-xl"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full bg-transparent sm:text-lg px-4 rounded-xl resize-none bg-white py-4 h-[60px] pr-16"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          onInput={() => {
            autoResizeTextarea();
          }}
        />

        <div className="flex px-2 items-center right-0 inset-y-0 absolute">
          <button
            className="bg-purple-600 text-white w-12 h-12 rounded-full flex items-center justify-center shadow-md"
            type="submit"
            title="Send"
          >
            <PaperAirplaneIcon className="w-6 h-6" />
          </button>
        </div>
      </form>
    </>
  );
}