"use client";

import { useMutation, useQuery } from "@/usingSession";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import React from 'react'
import Link from "next/link";
import Markdown from "@/components/Markdown";
import { ArrowLeftIcon, InformationCircleIcon } from "@heroicons/react/24/outline";
import { ArrowRightIcon } from "@heroicons/react/16/solid";
import { PrimaryButton } from "@/components/PrimaryButton";
import Chat from "@/components/super-assistant/Chat";


type ChatProps = {
  params: {
    courseSlug: string;
    chatId: Id<"chats">;
  };
};


export default function ChatPage({ params: { courseSlug, chatId } }: ChatProps) {
    const chatName = useQuery(api.sachat.getName, { chatId });

    return (
    <>
        <div className="p-6">
          <div className="max-w-xl mx-auto">
            <header className="fixed h-14 sm:h-16 top-0 left-0 w-full bg-white bg-opacity-90 backdrop-blur-lg p-4 shadow-lg flex items-center justify-center z-10">
              <Link
                href={`/${courseSlug}/super-assistant`}
                title="Back"
                className="absolute top-0 left-0 sm:w-16 sm:h-16 w-14 h-14 flex items-center justify-center"
              >
                <ArrowLeftIcon className="w-6 h-6" />
              </Link>

              <h1 className="text-lg sm:text-xl font-medium text-center">
                {chatName ? chatName : "Chat"}
              </h1>
            </header>

            <div className="h-14"></div>

            <Chat chatId={chatId} />
          </div>
        </div>
    </>
    );
}

