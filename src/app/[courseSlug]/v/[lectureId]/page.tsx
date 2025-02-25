"use client";

import { useParams } from "next/navigation";
import React, { useCallback, useRef } from "react";
import ReactPlayer from "react-player/file";
import { Id } from "../../../../../convex/_generated/dataModel";
import { useAction, useMutation, useQuery } from "@/usingSession";
import { api } from "../../../../../convex/_generated/api";
import ChatBubble from "@/components/ChatBubble";
import MessageInput from "@/components/MessageInput";

export default function VideoPage() {
  const params = useParams();
  const lectureId = params.lectureId as Id<"lectures">;

  const chat = useQuery(api.video.chat.get, {
    lectureId,
  });
  const hasThread = chat?.hasThread;

  const initializeChat = useAction(api.video.chat.initializeChat);
  const send = useMutation(api.video.chat.sendMessage);
  const handleSend = useCallback(
    async (message: string) => {
      if (!hasThread) {
        await initializeChat({ lectureId });
      }

      await send({
        lectureId,
        message,
      });
    },
    [send, initializeChat, lectureId, hasThread],
  );

  const playerRef = useRef<ReactPlayer>(null);

  return (
    <div className="flex flex-col xl:flex-row h-screen p-4 xl:p-8 space-y-4 xl:space-y-0 xl:space-x-8">
      <div className="xl:flex-1">
        <div className="overflow-hidden rounded-xl shadow-lg relative">
          <ReactPlayer
            ref={playerRef}
            url="https://streaming.cast.switch.ch/hls/p/113/sp/11300/serveFlavor/entryId/0_tfx5i6lk/v/2/ev/3/flavorId/0_mb7mr3wa/name/a.mp4/index.m3u8"
            style={{ aspectRatio: "16 / 9" }}
            controls
            width="100%"
            height="100%"
          />
        </div>
      </div>

      {/* use translateZ(0) to reset the fixed positioning of the chat */}
      <div className="xl:min-w-[65ch] rounded-xl bg-blue-100 h-full [transform:translateZ(0)]">
        <div className="overflow-y-auto flex flex-col gap-6 h-full p-4">
          {chat?.messages.map((m) => <ChatMessage key={m.id} {...m} />)}
          <MessageInput onSend={handleSend} />
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
