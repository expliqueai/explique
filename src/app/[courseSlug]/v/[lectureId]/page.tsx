"use client";

import { useParams } from "next/navigation";
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
  const lectureId = params.lectureId as Id<"lectures">;
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
        return `[${pad(hours)}:${pad(minutes)}:${pad(secs)}]`;
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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chat?.messages]);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <ActivityHeader goBackTo={"/"} title={"Video player"} />
      {/* Main content container - changed to row layout */}
      <div className="flex flex-col lg:flex-row p-6 gap-2 h-full">
        {/* Video Player Section with rounded corners */}
        <div className="relative w-full rounded-xl overflow-hidden bg-black">
          <ReactPlayer
            ref={playerRef}
            url="https://streaming.cast.switch.ch/hls/p/113/sp/11300/serveFlavor/entryId/0_tfx5i6lk/v/2/ev/3/flavorId/0_mb7mr3wa/name/a.mp4/index.m3u8"
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
            {chat?.messages.map((m) => <ChatMessage key={m.id} {...m} />)}
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
}: {
  content: string;
  system: boolean;
  appearance: "typing" | "error" | undefined;
}) {
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
    />
  );
});
