"use client";

import { useParams, useSearchParams } from "next/navigation";
import React, { useCallback, useEffect, useRef, useState } from "react";
import ReactPlayer from "react-player/file";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { useAction, useMutation, useQuery } from "@/usingSession";
import { api } from "../../../../../convex/_generated/api";
import ChatBubble from "@/components/ChatBubble";
import ActivityHeader from "@/components/ActivityHeader";
import MessageInput from "@/components/MessageInput";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { useCourseSlug } from "@/hooks/useCourseSlug";

export default function VideoPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const courseSlug = useCourseSlug();
  const lectureId = params.lectureId as Id<"lectures">;
  const lectureMetadata = useQuery(api.lectures.getMetadata, {
    lectureId,
  });
  const chat = useQuery(api.video.chat.get, {
    lectureId,
  });

  const [currentTime, setCurrentTime] = useState(0);
  const handleProgress = useCallback(
    ({ playedSeconds }: { playedSeconds: number }) => {
      setCurrentTime(playedSeconds);
    },
    [],
  );

  const hasThread = chat?.hasThread;
  const initializeChat = useAction(api.video.chat.initialize);
  const send = useMutation(api.video.chat.sendMessage);
  const clearChatHistory = useMutation(api.video.chat.clearHistory);

  const handleSend = useCallback(
    async (message: string) => {
      const formatTimestamp = (seconds: number): string => {
        return `<timestamp>${Math.floor(seconds)}</timestamp>`;
      };
      const timestampedMessage = `${formatTimestamp(currentTime)}\n${message}`;
      if (!hasThread) {
        await initializeChat({ lectureId });
      }
      await send({ lectureId, message: timestampedMessage });
    },
    [send, initializeChat, lectureId, hasThread, currentTime],
  );

  const playerRef = useRef<ReactPlayer>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Function to seek to a specific timestamp
  const seekToTime = useCallback((seconds: number) => {
    if (playerRef.current) {
      playerRef.current.seekTo(seconds);
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chat?.messages]);

  // Handle timestamp from URL parameter when the page loads
  useEffect(() => {
    const timestamp = searchParams.get("timestamp");
    if (timestamp && playerRef.current) {
      const seconds = parseInt(timestamp);
      if (!isNaN(seconds)) {
        playerRef.current.seekTo(seconds);
      }
    }
  }, [searchParams]);

  // Initialize chat on page load if it doesn't exist yet
  useEffect(() => {
    if (chat && !hasThread) {
      initializeChat({ lectureId }).catch(console.error);
    }
  }, [chat, hasThread, initializeChat, lectureId]);

  return (
    <div className="flex flex-col h-screen">
      <ActivityHeader
        goBackTo={`/${courseSlug}`}
        title={lectureMetadata?.name}
        action={
          <button
            className="sm:w-16 sm:h-16 w-14 h-14 flex items-center justify-center cursor-pointer"
            onClick={() => clearChatHistory({ lectureId })}
          >
            <ArrowPathIcon className="w-6 h-6" />
          </button>
        }
        isSolid
      />
      {/* Main content container - responsive layout */}
      <div className="flex flex-col lg:flex-row p-6 grow overflow-hidden">
        {/* Video Player Section */}
        <div className="min-h-[40vh] lg:min-h-0 max-h-[50vh] lg:max-h-none items-center relative w-full lg:flex-1 rounded-xl overflow-hidden bg-black">
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
        <div className="w-full max-h-[45vh] lg:max-h-none lg:min-w-[65ch] lg:w-[65ch] border rounded-xl lg:ml-4 flex flex-col shrink-0 mt-4 lg:mt-0 overflow-hidden">
          <div
            ref={scrollRef}
            className="overflow-y-auto flex-1 flex flex-col gap-6 p-4"
          >
            {chat?.messages.map((m) => (
              <ChatMessage key={m.id} {...m} seekToTime={seekToTime} />
            ))}
          </div>
          <div className="p-4 border-t">
            <MessageInput onSend={handleSend} scroll="parent" variant="solid" />
          </div>
        </div>
      </div>
    </div>
  );
}

const ChatMessage = React.memo(function ChatMessage({
  content,
  system,
  appearance,
  isFallbackModel,
  seekToTime,
}: {
  content: string;
  system: boolean;
  appearance: "typing" | "error" | undefined;
  isFallbackModel: boolean | undefined;
  seekToTime: (seconds: number) => void;
}) {
  // Parse timestamp pattern and convert to markdown links
  const processContent = useCallback(
    (text: string) => {
      if (appearance !== undefined || !text) return text;

      // Replace <timestamp>seconds</timestamp> with markdown links
      return text.replace(
        /<timestamp>(\d+)<\/timestamp>/g,
        (match, seconds) => {
          const totalSeconds = parseInt(seconds);
          const pad = (num: number): string => num.toString().padStart(2, "0");
          const hours = Math.floor(totalSeconds / 3600);
          const minutes = Math.floor((totalSeconds % 3600) / 60);
          const secs = Math.floor(totalSeconds % 60);
          return `[${pad(hours)}:${pad(minutes)}:${pad(secs)}](timestamp=${totalSeconds})`;
        },
      );
    },
    [appearance],
  );

  const processedContent = processContent(content);

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
            const seconds = parseInt(props.href.replace("timestamp=", ""));
            return (
              <span
                {...props}
                className="underline cursor-pointer"
                onClick={(e) => {
                  e.preventDefault();
                  seekToTime(seconds);
                }}
              />
            );
          }
          return <a {...props} />;
        },
      }}
    />
  );
});
