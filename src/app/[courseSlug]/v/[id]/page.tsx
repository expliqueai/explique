"use client";

import React, { useRef } from "react";
import ReactPlayer from "react-player/youtube";

export default function VideoPage() {
  const playerRef = useRef<ReactPlayer>(null);

  return (
    <div className="flex flex-col xl:flex-row h-screen p-4 xl:p-8 space-y-4 xl:space-y-0 xl:space-x-8">
      <div className="xl:flex-1">
        <div className="overflow-hidden rounded-xl shadow-lg relative">
          <ReactPlayer
            ref={playerRef}
            url="https://www.youtube.com/watch?v=LXb3EKWsInQ"
            style={{ aspectRatio: "16 / 9" }}
            config={{
              playerVars: {
                color: "white",
              },
            }}
            controls
            width="100%"
            height="100%"
          />
        </div>
      </div>
      <div className="xl:min-w-[65ch] rounded-xl bg-blue-100 p-4 overflow-y-auto h-full"></div>
    </div>
  );
}
