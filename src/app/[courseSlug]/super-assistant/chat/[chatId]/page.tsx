"use client"

import Chat from "@/components/super-assistant/Chat"
import { useQuery } from "@/usingSession"
import { ArrowLeftIcon } from "@heroicons/react/24/outline"
import Link from "next/link"
import React, { use } from "react"
import { api } from "../../../../../../convex/_generated/api"
import { Id } from "../../../../../../convex/_generated/dataModel"

type ChatProps = {
  params: Promise<{
    courseSlug: string
    chatId: Id<"chats">
  }>
}

export default function ChatPage({ params }: ChatProps) {
  const { courseSlug, chatId } = use(params)
  const chatName = useQuery(api.superassistant.chat.getName, { chatId })

  return (
    <>
      <div className="p-6">
        <div className="mx-auto max-w-xl">
          <header className="bg-opacity-90 fixed top-0 left-0 z-10 flex h-14 w-full items-center justify-center bg-white p-4 shadow-lg backdrop-blur-lg sm:h-16">
            <Link
              href={`/${courseSlug}/super-assistant`}
              title="Back"
              className="absolute top-0 left-0 flex h-14 w-14 items-center justify-center sm:h-16 sm:w-16"
            >
              <ArrowLeftIcon className="h-6 w-6" />
            </Link>

            <h1 className="text-center text-lg font-medium sm:text-xl">
              {chatName === undefined ? "" : chatName ? chatName : "Chat"}
            </h1>
          </header>

          <div className="h-14"></div>

          <Chat chatId={chatId} />
        </div>
      </div>
    </>
  )
}
