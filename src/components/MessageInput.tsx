import { PaperAirplaneIcon } from "@heroicons/react/24/outline";
import { useEffect, useRef, useState } from "react";
import * as Sentry from "@sentry/nextjs";

export default function MessageInput({
  onSend,
  scroll,
  variant = "fixed", // Add variant parameter with "fixed" as default
}: {
  onSend: (message: string) => void;
  scroll: "body" | "parent";
  variant?: "fixed" | "solid"; // Two variants: fixed (original) and solid (new)
}) {
  const [message, setMessage] = useState("");

  function autoResizeTextarea() {
    if (!textareaRef.current || !paddingRef.current) return;

    const scrollableElement =
      scroll === "body" ? document.body : paddingRef.current.parentElement;
    if (!scrollableElement) {
      Sentry.captureMessage("Missing scrollable element");
      return;
    }

    const isScrolledToBottom =
      Math.abs(
        scrollableElement.clientHeight +
          scrollableElement.scrollTop -
          scrollableElement.scrollHeight,
      ) < 1;

    textareaRef.current.style.height = "0";
    const newHeight = Math.min(500, textareaRef.current.scrollHeight) + "px";
    textareaRef.current.style.height = newHeight;
    paddingRef.current.style.height = newHeight;

    if (isScrolledToBottom) {
      scrollableElement.scrollTo({ top: scrollableElement.scrollHeight });
    }
  }

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    window.addEventListener("resize", autoResizeTextarea);
    return () => window.removeEventListener("resize", autoResizeTextarea);
  });

  const paddingRef = useRef<HTMLDivElement>(null);

  function send() {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;

    onSend(trimmedMessage);

    setMessage("");
    setTimeout(() => {
      autoResizeTextarea();
    }, 0);
  }

  return variant === "fixed" ? (
    // Original fixed positioning layout
    <>
      <div className="box-content h-[60px] pt-4 shrink-0" ref={paddingRef} />
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
  ) : (
    // New solid/relative positioning layout
    <div className="relative">
      <form
        className="flex w-full rounded-xl"
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
    </div>
  );
}
