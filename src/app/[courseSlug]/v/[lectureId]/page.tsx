"use client"

import ActivityHeader from "@/components/ActivityHeader"
import ChatBubble from "@/components/ChatBubble"
import { Button } from "@/components/ui/button"
import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from "@/components/ui/prompt-input"
import { useCourseSlug } from "@/hooks/useCourseSlug"
import { useAction, useMutation, useQuery } from "@/usingSession"
import { ArrowUpIcon, StopIcon } from "@heroicons/react/16/solid"
import { ArrowPathIcon } from "@heroicons/react/24/outline"
import { useParams, useSearchParams } from "next/navigation"
import React, { useCallback, useEffect, useRef, useState } from "react"
import ReactPlayer from "react-player"
import { api } from "../../../../../convex/_generated/api"
import type { Id } from "../../../../../convex/_generated/dataModel"

export default function VideoPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const courseSlug = useCourseSlug()
  const lectureId = params.lectureId as Id<"lectures">
  const lectureMetadata = useQuery(api.lectures.getMetadata, {
    lectureId,
  })
  const chat = useQuery(api.video.chat.get, {
    lectureId,
  })

  const [currentTime, setCurrentTime] = useState(0)
  const handleProgress = useCallback(
    ({ playedSeconds }: { playedSeconds: number }) => {
      setCurrentTime(playedSeconds)
    },
    []
  )

  const hasThread = chat?.hasThread
  const initializeChat = useAction(api.video.chat.initialize)
  const send = useMutation(api.video.chat.sendMessage)
  const clearChatHistory = useMutation(api.video.chat.clearHistory)
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSend = useCallback(
    async (message: string) => {
      if (!message.trim() || isLoading) return

      setIsLoading(true)
      try {
        const formatTimestamp = (seconds: number): string => {
          return `<timestamp>${Math.floor(seconds)}</timestamp>`
        }
        const timestampedMessage = `${formatTimestamp(currentTime)}\n${message}`
        if (!hasThread) {
          await initializeChat({ lectureId })
        }
        await send({ lectureId, message: timestampedMessage })
        setInput("")
      } finally {
        setIsLoading(false)
      }
    },
    [send, initializeChat, lectureId, hasThread, currentTime, isLoading]
  )

  const playerRef = useRef<ReactPlayer>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Function to seek to a specific timestamp
  const seekToTime = useCallback((seconds: number) => {
    if (playerRef.current) {
      playerRef.current.seekTo(seconds)
    }
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [chat?.messages])

  // Handle timestamp from URL parameter when the page loads
  useEffect(() => {
    const timestamp = searchParams.get("timestamp")
    if (timestamp && playerRef.current) {
      const seconds = parseInt(timestamp)
      if (!isNaN(seconds)) {
        playerRef.current.seekTo(seconds)
      }
    }
  }, [searchParams])

  // Initialize chat on page load if it doesn't exist yet
  useEffect(() => {
    if (chat && !hasThread) {
      initializeChat({ lectureId }).catch(console.error)
    }
  }, [chat, hasThread, initializeChat, lectureId])

  return (
    <div className="flex h-screen flex-col">
      <ActivityHeader
        goBackTo={`/${courseSlug}`}
        title={lectureMetadata?.name}
        action={
          <button
            className="flex h-14 w-14 cursor-pointer items-center justify-center sm:h-16 sm:w-16"
            onClick={() => clearChatHistory({ lectureId })}
          >
            <ArrowPathIcon className="h-6 w-6" />
          </button>
        }
        isSolid
      />
      {/* Main content container - responsive layout */}
      <div className="flex grow flex-col overflow-hidden p-6 lg:flex-row">
        {/* Video Player Section */}
        <div className="relative max-h-[50vh] min-h-[40vh] w-full items-center overflow-hidden rounded-xl bg-black lg:max-h-none lg:min-h-0 lg:flex-1">
          <ReactPlayer
            ref={playerRef}
            url={lectureMetadata?.url}
            width="100%"
            height="100%"
            controls
            onProgress={handleProgress}
          />
        </div>

        {/* Chat Section - height constrained in mobile */}
        <div className="mt-4 flex max-h-[45vh] w-full shrink-0 flex-col overflow-hidden rounded-xl border lg:mt-0 lg:ml-4 lg:max-h-none lg:w-[65ch] lg:min-w-[65ch]">
          <div
            ref={scrollRef}
            className="flex flex-1 flex-col gap-6 overflow-y-auto p-4"
          >
            {chat?.messages.map((m) => (
              <ChatMessage key={m.id} {...m} seekToTime={seekToTime} />
            ))}
          </div>
          <div className="border-t p-4">
            <PromptInput
              value={input}
              onValueChange={(value) => setInput(value)}
              onSubmit={() => handleSend(input)}
              className="w-full rounded-xl shadow-xl"
            >
              <PromptInputTextarea placeholder="Ask a question on the lecture content" />
              <PromptInputActions className="justify-end pt-2">
                <PromptInputAction tooltip="Send message">
                  <Button
                    variant="default"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    onClick={() => handleSend(input)}
                    disabled={isLoading || !input.trim()}
                  >
                    {isLoading ? (
                      <StopIcon className="size-5 fill-current" />
                    ) : (
                      <ArrowUpIcon className="size-5" />
                    )}
                  </Button>
                </PromptInputAction>
              </PromptInputActions>
            </PromptInput>
          </div>
        </div>
      </div>
    </div>
  )
}

const ChatMessage = React.memo(function ChatMessage({
  content,
  system,
  appearance,
  isFallbackModel,
  seekToTime,
}: {
  content: string
  system: boolean
  appearance: "typing" | "error" | undefined
  isFallbackModel: boolean | undefined
  seekToTime: (seconds: number) => void
}) {
  // Parse timestamp pattern and convert to markdown links
  const processContent = useCallback(
    (text: string) => {
      if (appearance !== undefined || !text) return text

      // Replace <timestamp>seconds</timestamp> with markdown links
      return text.replace(
        /<timestamp>(\d+)<\/timestamp>/g,
        (match, seconds) => {
          const totalSeconds = parseInt(seconds)
          const pad = (num: number): string => num.toString().padStart(2, "0")
          const hours = Math.floor(totalSeconds / 3600)
          const minutes = Math.floor((totalSeconds % 3600) / 60)
          const secs = Math.floor(totalSeconds % 60)
          return `[${pad(hours)}:${pad(minutes)}:${pad(secs)}](timestamp=${totalSeconds})`
        }
      )
    },
    [appearance]
  )

  const processedContent = processContent(content)

  return (
    <ChatBubble
      author={system ? "system" : "user"}
      isFallbackModel={isFallbackModel}
      contents={
        appearance === "typing"
          ? { type: "typing" }
          : appearance === "error"
            ? { type: "error" }
            : {
                type: "message",
                message: processedContent,
              }
      }
      components={{
        a(props) {
          // Handle timestamp links
          if (props.href?.startsWith("timestamp=")) {
            const seconds = parseInt(props.href.replace("timestamp=", ""))
            return (
              <span
                {...props}
                className="cursor-pointer underline"
                onClick={(e) => {
                  e.preventDefault()
                  seekToTime(seconds)
                }}
              />
            )
          }
          return <a {...props} />
        },
      }}
    />
  )
})
