"use client"

import React, { use, useState } from "react";
import Chat from "@/components/super-assistant/Chat";
import { useMutation, useQuery } from "@/usingSession";
import { ArrowLeftIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import Tooltip from "@/components/Tooltip";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";




export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const attemptId = id as Id<"saAttempts">;
  const courseSlug = useQuery(api.superassistant.attempt.getCourseSlug, { attemptId });
  const chatName = useQuery(api.superassistant.attempt.getName, { attemptId });


  return (
    <div className="p-6">
      <div className="mx-auto max-w-xl">
        <header className="bg-opacity-90 fixed top-0 left-0 z-10 flex h-14 w-full items-center justify-center bg-white p-4 shadow-lg backdrop-blur-lg sm:h-16">
          <Link
            href={`/${courseSlug}/exercises`}
            title="Back"
            className="absolute top-0 left-0 flex h-14 w-14 items-center justify-center sm:h-16 sm:w-16"
          >
            <ArrowLeftIcon className="h-6 w-6" />
          </Link>

          <h1 className="text-center text-lg font-medium sm:text-xl">
            {chatName === undefined ? "" : chatName ? chatName : "Chat"}
          </h1>

          <div className="absolute top-0 right-0">
            <RestartButton chatId={attemptId} />
          </div>
        </header>

        <div className="h-14"></div>

        <Chat chatId={attemptId} />
      </div>
    </div>
  )
}


function RestartButton({ chatId }: { chatId: Id<"saAttempts"> }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const resetAttempt = useMutation(api.superassistant.attempt.resetAttempt);

  return (
    <>
      <Tooltip
        asChild
        side="bottom"
        sideOffset={-10}
        tip="Restart the attempt"
      >
        <button
          className="sm:w-16 sm:h-16 w-14 h-14 flex items-center justify-center"
          onClick={() => setIsModalOpen(true)}
        >
          <ArrowPathIcon className="w-6 h-6" />
        </button>
      </Tooltip>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Restart the attempt?"
      >
        <div className="mt-2">
          <p className="text-sm text-gray-500">
            If you’re experiencing issues, you can restart the attempt and try
            again.
          </p>
        </div>

        <div className="mt-4 flex gap-2 justify-end">
          <Button
            onClick={() => setIsModalOpen(false)}
            variant="secondary"
            size="sm"
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={async () => { 
              await resetAttempt({ attemptId:chatId });
              setIsModalOpen(false);
            }}
          >
            Restart
          </Button>
        </div>
      </Modal>
    </>
  );
}
