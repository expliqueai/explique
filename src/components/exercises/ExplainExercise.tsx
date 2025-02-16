import { useEffect } from "react";
import { useMutation, useQuery } from "@/usingSession";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { ArrowRightIcon, SparklesIcon } from "@heroicons/react/16/solid";
import Markdown from "../Markdown";
import { PrimaryButton } from "../PrimaryButton";
import Instruction from "../Instruction";
import MessageInput from "../MessageInput";
import ChatBubble from "../ChatBubble";
import React from "react";

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

  useEffect(() => {
    setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    }, 0);
  }, [chat]);

  return (
    <>
      <div className="flex flex-col gap-6">
        {chat?.map((message) => (
          <ChatMessage
            key={message.id}
            {...message}
            hasQuiz={hasQuiz}
            succeeded={succeeded}
            nextButton={nextButton}
            attemptId={attemptId}
          />
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

const ChatMessage = React.memo(function ChatMessage({
  id,
  system,
  content,
  appearance,
  isReported,

  hasQuiz,
  succeeded,
  nextButton,
  attemptId,
}: {
  id: Id<"messages">;
  system: boolean;
  content: string;
  appearance: "error" | "typing" | "feedback" | "finished" | undefined;
  isReported: boolean;

  hasQuiz: boolean;
  succeeded: boolean;
  nextButton: "show" | "hide" | "disable";
  attemptId: Id<"attempts">;
}) {
  const reportMessage = useMutation(api.chat.reportMessage);
  const unreportMessage = useMutation(api.chat.unreportMessage);
  const goToQuiz = useMutation(api.attempts.goToQuiz);

  if (appearance === "finished") {
    return (
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
    );
  }

  if (appearance === "feedback") {
    return (
      <div>
        <div className="flex flex-col items-center gap-4">
          <Instruction variant="success">
            <strong>Great!</strong> We will now provide feedback on your
            explanation.
          </Instruction>

          {content === "" ? (
            <div className="flex gap-2 my-4" aria-label="Loading">
              <div className="w-3 h-3 rounded-full bg-slate-400 animate-pulse"></div>
              <div className="w-3 h-3 rounded-full bg-slate-400 animate-pulse animation-delay-1-3"></div>
              <div className="w-3 h-3 rounded-full bg-slate-400 animate-pulse animation-delay-2-3"></div>
            </div>
          ) : content === "error" ? (
            <Instruction variant="error">An error occurred.</Instruction>
          ) : (
            <div>
              <div className="border-l-4 border-slate-300 pl-4 py-1">
                <Markdown text={content} />
              </div>
              <p className="text-slate-500 flex items-center gap-2 w-full my-2">
                <SparklesIcon className="w-4 h-4" />
                This feedback is AI-generated and may be inaccurate.
              </p>
            </div>
          )}

          {!succeeded && nextButton !== "hide" && content !== "" && (
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
      </div>
    );
  }

  return (
    <ChatBubble
      author={system ? "system" : "user"}
      contents={
        appearance === "typing"
          ? { type: "typing" }
          : appearance === "error"
            ? { type: "error" }
            : { type: "message", message: content }
      }
      report={
        system && appearance === undefined
          ? {
              isReported: isReported,
              onReport: (reason) => reportMessage({ messageId: id, reason }),
              onUnreport: () => unreportMessage({ messageId: id }),
            }
          : undefined
      }
    />
  );
});

function NewMessage({ attemptId }: { attemptId: Id<"attempts"> }) {
  const sendMessage = useMutation(api.chat.sendMessage);

  return (
    <MessageInput
      onSend={(message) => {
        sendMessage({ attemptId, message });
      }}
    />
  );
}
