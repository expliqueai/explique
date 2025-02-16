import { PaperAirplaneIcon } from "@heroicons/react/24/outline";
import { useEffect, useRef, useState } from "react";

export default function MessageInput({
  onSend,
}: {
  onSend: (message: string) => void;
}) {
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
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;

    onSend(trimmedMessage);

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
