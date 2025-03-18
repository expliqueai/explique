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

export default function VideoPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const lectureId = params.lectureId as Id<"lectures">;
  const lectureUrl = useQuery(api.lectures.getUrl, {
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
  const initializeChat = useAction(api.video.chat.initializeChat);
  const send = useMutation(api.video.chat.sendMessage);

  const handleSend = useCallback(
    async (message: string) => {
      const formatTimestamp = (seconds: number): string => {
        const pad = (num: number): string => num.toString().padStart(2, "0");
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        return `<timestamp>${pad(hours)}:${pad(minutes)}:${pad(secs)}</timestamp>`;
      };
      const timestampedMessage = `${formatTimestamp(currentTime)} ${message}`;
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

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <ActivityHeader goBackTo={"/"} title={"Video player"} />
      {/* Main content container - changed to row layout */}
      <div className="flex flex-col lg:flex-row p-6 gap-2 h-full">
        {/* Video Player Section with rounded corners */}
        <div className="relative w-full rounded-xl overflow-hidden bg-black">
          <ReactPlayer
            ref={playerRef}
            url={lectureUrl}
            width="100%"
            height="100%"
            controls
            onProgress={handleProgress}
          />
        </div>

        {/* Chat Section - adjusted to be next to video on larger screens */}
        <div className="min-w-[65ch] w-full lg:w-1/3 border rounded-xl lg:ml-4 h-1/2 lg:h-full [transform:translateZ(0)]">
          <div
            ref={scrollRef}
            className="overflow-y-auto flex flex-col gap-6 h-full p-4"
          >
            {chat?.messages.map((m) => (
              <ChatMessage key={m.id} {...m} seekToTime={seekToTime} />
            ))}
            <MessageInput onSend={handleSend} scroll="parent" />
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
  seekToTime,
}: {
  content: string;
  system: boolean;
  appearance: "typing" | "error" | undefined;
  seekToTime: (seconds: number) => void;
}) {
  // Parse timestamp pattern and convert to markdown links
  const processContent = useCallback(
    (text: string) => {
      if (appearance !== undefined || !text) return text;
      console.log("Processing content", text);

      // Replace [hh:mm:ss] with markdown links
      return text.replace(
        /<timestamp>(\d{2}):(\d{2}):(\d{2})<\/timestamp>/g,
        (_, hours, minutes, seconds) => {
          const totalSeconds =
            parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds);
          return `[${hours}:${minutes}:${seconds}](timestamp=${totalSeconds})`;
        },
      );
    },
    [appearance],
  );

  const processedContent = processContent(content);

  return (
    <ChatBubble
      author={system ? "system" : "user"}
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
