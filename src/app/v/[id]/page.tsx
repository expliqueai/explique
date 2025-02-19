"use client";

import React, { useRef } from "react";
import ReactPlayer from "react-player/youtube";

export default function VideoPage() {
  const playerRef = useRef<ReactPlayer>(null);

  return (
    <div className="flex justify-center mt-8">
      <div className="overflow-hidden rounded-xl shadow-lg">
        <ReactPlayer
          ref={playerRef}
          url="https://www.youtube.com/watch?v=LXb3EKWsInQ"
          config={{
            playerVars: {
              color: "white",
            },
          }}
          controls
        />
      </div>
    </div>
  );
}
