/**
 * @deprecated This component has been deprecated and will be removed in future versions.
 * Please use the PromptInput component instead.
 */
import { PaperAirplaneIcon } from "@heroicons/react/24/outline"
import * as Sentry from "@sentry/nextjs"
import { useEffect, useRef, useState } from "react"

export default function MessageInput({
  onSend,
  scroll,
  variant = "fixed", // Add variant parameter with "fixed" as default
}: {
  onSend: (message: string) => void
  scroll: "body" | "parent"
  variant?: "fixed" | "solid" // Two variants: fixed (original) and solid (new)
}) {
  const [message, setMessage] = useState("")

  function autoResizeTextarea() {
    if (!textareaRef.current || !paddingRef.current) return

    const scrollableElement =
      scroll === "body" ? document.body : paddingRef.current.parentElement
    if (!scrollableElement) {
      Sentry.captureMessage("Missing scrollable element")
      return
    }

    const isScrolledToBottom =
      Math.abs(
        scrollableElement.clientHeight +
          scrollableElement.scrollTop -
          scrollableElement.scrollHeight
      ) < 1

    textareaRef.current.style.height = "0"
    const newHeight = Math.min(500, textareaRef.current.scrollHeight) + "px"
    textareaRef.current.style.height = newHeight
    paddingRef.current.style.height = newHeight

    if (isScrolledToBottom) {
      scrollableElement.scrollTo({ top: scrollableElement.scrollHeight })
    }
  }

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    window.addEventListener("resize", autoResizeTextarea)
    return () => window.removeEventListener("resize", autoResizeTextarea)
  })

  const paddingRef = useRef<HTMLDivElement>(null)

  function send() {
    const trimmedMessage = message.trim()
    if (!trimmedMessage) return

    onSend(trimmedMessage)

    setMessage("")
    setTimeout(() => {
      autoResizeTextarea()
    }, 0)
  }

  return variant === "fixed" ? (
    // Original fixed positioning layout
    <>
      <div className="box-content h-[60px] shrink-0 pt-4" ref={paddingRef} />
      <form
        className="fixed bottom-2 left-2 flex w-[calc(100%-1rem)] rounded-xl shadow-xl"
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
      >
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="h-[60px] w-full resize-none rounded-xl bg-transparent bg-white px-4 py-4 pr-16 sm:text-lg"
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
    </>
  ) : (
    // New solid/relative positioning layout
    <div className="relative">
      <form
        className="flex w-full rounded-xl"
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
      >
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="h-[60px] w-full resize-none rounded-xl bg-transparent bg-white px-4 py-4 pr-16 sm:text-lg"
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
    </div>
  )
}
