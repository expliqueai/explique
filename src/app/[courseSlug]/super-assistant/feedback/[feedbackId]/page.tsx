"use client"

import Markdown from "@/components/Markdown"
import { PrimaryButton } from "@/components/PrimaryButton"
import Feedback from "@/components/super-assistant/Feedback"
import { useMutation, useQuery } from "@/usingSession"
import { ArrowRightIcon } from "@heroicons/react/16/solid"
import { ArrowLeftIcon } from "@heroicons/react/24/outline"
import Link from "next/link"
import React, { use } from "react"
import { api } from "../../../../../../convex/_generated/api"
import { Id } from "../../../../../../convex/_generated/dataModel"

type FeedbackProps = {
  params: Promise<{
    courseSlug: string
    feedbackId: Id<"feedbacks">
  }>
}

export default function FeedbackPage({ params }: FeedbackProps) {
  const { courseSlug, feedbackId } = use(params)
  const feedbackMessage = useQuery(api.feedbackmessages.getFeedback, {
    feedbackId,
  })
  const feedback = useQuery(api.feedback.get, { feedbackId })
  const imageUrl = useQuery(api.feedback.getImage, { feedbackId })
  const goToChat = useMutation(api.feedback.goToChat)

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
              {feedback === undefined
                ? ""
                : feedback?.name
                  ? feedback.name
                  : "Feedback"}
            </h1>
          </header>

          <div className="h-14"></div>

          {feedback?.status === "feedback" ? (
            <>
              {imageUrl !== null && imageUrl !== undefined && (
                <picture>
                  <img className="p-4" src={imageUrl} alt={""} />
                </picture>
              )}

              {feedbackMessage?.content === null ||
              feedbackMessage?.content === undefined ||
              feedbackMessage.content === "" ? (
                <h1>Feedback loading...</h1>
              ) : (
                <>
                  <Markdown text={feedbackMessage.content} />

                  {!feedbackMessage.streaming && (
                    <footer className="mt-8 flex justify-center">
                      <div className="flex flex-col items-center gap-2">
                        <PrimaryButton
                          onClick={async () => {
                            await goToChat({ feedbackId })
                          }}
                        >
                          Chat with the Super-Assistant
                          <ArrowRightIcon className="h-5 w-5" />
                        </PrimaryButton>
                      </div>
                    </footer>
                  )}
                </>
              )}
            </>
          ) : (
            <Feedback feedbackId={feedbackId} courseSlug={courseSlug} />
          )}
        </div>
      </div>
    </>
  )
}