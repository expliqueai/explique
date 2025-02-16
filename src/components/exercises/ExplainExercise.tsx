import { useEffect, useRef, useState } from "react";
import {
  HandThumbDownIcon,
  PaperAirplaneIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useMutation, useQuery } from "@/usingSession";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { ArrowRightIcon, SparklesIcon } from "@heroicons/react/16/solid";
import Markdown from "../Markdown";
import { PrimaryButton } from "../PrimaryButton";
import Input from "../Input";
import { Button } from "../Button";
import { Modal } from "@/components/Modal";
import { toast } from "sonner";
import Instruction from "../Instruction";

export default function ExplainExercise({
  hasQuiz,
  attemptId,
  writeDisabled,
  nextButton,
  succeeded,
}: {
  hasQuiz: boolean;
  attemptId: Id<"attempts">;
  writeDisabled: boolean;
  nextButton: "show" | "hide" | "disable";
  succeeded: boolean;
}) {
  const chat = useQuery(api.chat.getMessages, { attemptId });
  const goToQuiz = useMutation(api.attempts.goToQuiz);

  useEffect(() => {
    setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    }, 0);
  }, [chat]);

  return (
    <>
      <div className="flex flex-col gap-6">
        {chat?.map((message) => (
          <div key={message.id}>
            {message.appearance === "finished" ? (
              <div className="flex flex-col items-center gap-4">
                <Instruction variant="success">
                  <strong>Great!</strong>
                  {hasQuiz
                    ? "Now, let’s go on to a quiz question."
                    : "You have completed this exercise."}
                </Instruction>

                {!succeeded && nextButton !== "hide" && hasQuiz && (
                  <div className="flex flex-col gap-2 items-center">
                    <PrimaryButton
                      onClick={async () => {
                        await goToQuiz({ attemptId });
                      }}
                      disabled={nextButton === "disable"}
                    >
                      Continue to the quiz
                      <ArrowRightIcon className="w-5 h-5" />
                    </PrimaryButton>
                  </div>
                )}
              </div>
            ) : message.appearance === "feedback" ? (
              <>
                <div className="flex flex-col items-center gap-4">
                  <Instruction variant="success">
                    <strong>Great!</strong> We will now provide feedback on your
                    explanation.
                  </Instruction>

                  {message.content === "" ? (
                    <div className="flex gap-2 my-4" aria-label="Loading">
                      <div className="w-3 h-3 rounded-full bg-slate-400 animate-pulse"></div>
                      <div className="w-3 h-3 rounded-full bg-slate-400 animate-pulse animation-delay-1-3"></div>
                      <div className="w-3 h-3 rounded-full bg-slate-400 animate-pulse animation-delay-2-3"></div>
                    </div>
                  ) : message.content === "error" ? (
                    <Instruction variant="error">
                      An error occurred.
                    </Instruction>
                  ) : (
                    <div>
                      <div className="border-l-4 border-slate-300 pl-4 py-1">
                        <Markdown text={message.content} />
                      </div>
                      <p className="text-slate-500 flex items-center gap-2 w-full my-2">
                        <SparklesIcon className="w-4 h-4" />
                        This feedback is AI-generated and may be inaccurate.
                      </p>
                    </div>
                  )}

                  {!succeeded &&
                    nextButton !== "hide" &&
                    message.content !== "" && (
                      <div className="flex flex-col gap-2 items-center">
                        <PrimaryButton
                          onClick={async () => {
                            await goToQuiz({ attemptId });
                          }}
                          disabled={nextButton === "disable"}
                        >
                          Continue to the quiz
                          <ArrowRightIcon className="w-5 h-5" />
                        </PrimaryButton>
                      </div>
                    )}
                </div>
              </>
            ) : (
              <div
                className={clsx(
                  "flex",
                  message.system && "mr-6",
                  !message.system && "ml-6",
                )}
              >
                <div
                  className={clsx(
                    "inline-block p-3 sm:p-4 rounded-xl shadow relative",
                    message.system && "bg-white rounded-bl-none",
                    !message.system &&
                      "bg-gradient-to-b from-purple-500 to-purple-600 text-white rounded-br-none ml-auto",
                  )}
                >
                  {message.system ? (
                    message.appearance === "typing" ? (
                      <div className="flex gap-1" aria-label="Loading">
                        <div className="w-2 h-2 rounded-full bg-slate-500 animate-pulse"></div>
                        <div className="w-2 h-2 rounded-full bg-slate-500 animate-pulse animation-delay-1-3"></div>
                        <div className="w-2 h-2 rounded-full bg-slate-500 animate-pulse animation-delay-2-3"></div>
                      </div>
                    ) : message.appearance === "error" ? (
                      <div>
                        <Instruction variant="error">
                          <strong>An error occurred.</strong> Please try again.
                        </Instruction>
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
                    <Markdown text={message.content} className="text-white" />
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {!writeDisabled && <NewMessage attemptId={attemptId} />}

      {succeeded && (
        <Instruction variant="success">
          <strong>Congratulations!</strong> You have finished this exercise.
        </Instruction>
      )}

      {nextButton === "disable" && (
        <Instruction variant="error">
          The due date for this exercise has passed.
        </Instruction>
      )}
    </>
  );
}

function ReportMessage({
  messageId,
  isReported,
}: {
  messageId: Id<"messages">;
  isReported: boolean;
}) {
  const reportMessage = useMutation(api.chat.reportMessage);
  const unreportMessage = useMutation(api.chat.unreportMessage);
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

function NewMessage({ attemptId }: { attemptId: Id<"attempts"> }) {
  const sendMessage = useMutation(api.chat.sendMessage);
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
    sendMessage({ attemptId, message: messageSent });
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
