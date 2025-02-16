import clsx from "clsx";
import Markdown from "./Markdown";
import Instruction from "./Instruction";
import ReportMessage, { ReportMessageProps } from "./ReportMessage";
import React from "react";

type ChatBubbleProps = {
  author: "user" | "system";
  contents:
    | { type: "typing" }
    | { type: "error" }
    | { type: "message"; message: string };
  report?: ReportMessageProps;
};

export default function ChatBubble({
  author,
  contents,
  report,
}: ChatBubbleProps) {
  const isSystem = author === "system";

  return (
    <div className={clsx("flex", isSystem ? "mr-6" : "ml-6")}>
      <div
        className={clsx(
          "inline-block p-3 sm:p-4 rounded-xl shadow relative",
          isSystem && "bg-white rounded-bl-none",
          !isSystem &&
            "bg-gradient-to-b from-purple-500 to-purple-600 text-white rounded-br-none ml-auto",
        )}
      >
        <ChatBubbleContents contents={contents} isSystem={isSystem} />

        {report && <ReportMessage {...report} />}
      </div>
    </div>
  );
}

const ChatBubbleContents = React.memo(function ChatBubbleContents({
  contents,
  isSystem,
}: {
  contents: ChatBubbleProps["contents"];
  isSystem: boolean;
}) {
  if (contents.type === "typing") {
    return (
      <div className="flex gap-1" aria-label="Loading">
        <div className="w-2 h-2 rounded-full bg-slate-500 animate-pulse"></div>
        <div className="w-2 h-2 rounded-full bg-slate-500 animate-pulse animation-delay-1-3"></div>
        <div className="w-2 h-2 rounded-full bg-slate-500 animate-pulse animation-delay-2-3"></div>
      </div>
    );
  }

  if (contents.type === "error") {
    return (
      <Instruction variant="error">
        <strong>An error occurred.</strong> Please try again.
      </Instruction>
    );
  }

  return (
    <Markdown
      text={contents.message}
      className={isSystem ? undefined : "text-white"}
    />
  );
});
