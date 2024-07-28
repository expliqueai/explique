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
import Feedback from "@/components/super-assistant/Feedback";


type FeedbackProps = {
  params: {
    courseSlug: string;
    feedbackId: Id<"feedbacks">;
  };
};


export default function FeedbackPage({ params: { courseSlug, feedbackId } }: FeedbackProps) {
  const feedbackMessage = useQuery(api.feedbackmessages.getFeedback, { feedbackId });
  const feedback = useQuery(api.feedback.get, { feedbackId });
  const imageUrl = useQuery(api.feedback.getImage, { feedbackId });
  const goToChat = useMutation(api.feedback.goToChat);

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
                Feedback
              </h1>
            </header>

            <div className="h-14"></div>

            { feedback?.status === "feedback" ? (
              <>
                {(imageUrl !== null && imageUrl !== undefined) && (
                  <picture>
                    <img
                      className="p-4"
                      src={imageUrl}
                      alt={""}
                    />
                  </picture>
                )}

                {feedbackMessage === null || feedbackMessage === undefined ? (
                  <h1>Feedback loading...</h1>
                ) : (
                  <>
                    <Markdown text={feedbackMessage} />

                    <footer className="flex justify-center mt-8">
                      <div className="flex flex-col gap-2 items-center">
                        <PrimaryButton
                          onClick={async () => {
                            await goToChat({ feedbackId });
                          }}
                        >
                          Chat with the Super-Assistant
                          <ArrowRightIcon className="w-5 h-5" />
                        </PrimaryButton>
                      </div>
                    </footer>
                  </>
                )}
              </>
            ) : (
              <Feedback feedbackId={feedbackId} />
            )}

          </div>
        </div>
      
    </>
  );
}

