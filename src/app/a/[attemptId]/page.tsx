"use client";

import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { ArrowLeftIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useQuery } from "@/usingSession";
import ExplainExercise from "@/components/exercises/ExplainExercise";
import QuizExercise from "@/components/exercises/QuizExercise";
import ReadingExercise from "@/components/exercises/ReadingExercise";
import { Fragment, useState } from "react";
import Tooltip from "@/components/Tooltip";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";

export default function Page({ params }: { params: { attemptId: string } }) {
  const attemptId = params.attemptId as Id<"attempts">;

  const metadata = useQuery(api.attempts.get, { id: attemptId });

  return (
    <div className="p-6">
      <div className="max-w-xl mx-auto">
        <header className="fixed h-14 sm:h-16 top-0 left-0 w-full bg-white bg-opacity-90 backdrop-blur-lg p-4 shadow-lg flex items-center justify-center z-10">
          {metadata && (
            <Link
              href={`/${metadata.courseSlug}`}
              title="Back"
              className="absolute top-0 left-0 sm:w-16 sm:h-16 w-14 h-14 flex items-center justify-center"
            >
              <ArrowLeftIcon className="w-6 h-6" />
            </Link>
          )}

          <h1 className="text-lg sm:text-xl font-medium text-center">
            {metadata?.exerciseName ?? (
              <div className="animate-pulse h-7 bg-slate-200 rounded w-56" />
            )}
          </h1>

          {metadata &&
            ((metadata.status === "exercise" && metadata.text === null) ||
              metadata.isAdmin) &&
            !metadata.isDue && (
              <RestartButton exerciseId={metadata.exerciseId} />
            )}
        </header>

        {metadata && (
          <>
            <div className="h-14"></div>

            {!metadata.isSolutionShown &&
              (metadata.quiz ? (
                <QuizExercise
                  attemptId={attemptId}
                  title={metadata.exerciseName}
                  questions={metadata.quiz}
                  lastSubmission={metadata.lastQuizSubmission}
                  succeeded={metadata.status === "quizCompleted"}
                  isDue={metadata.isDue}
                />
              ) : metadata.text ? (
                <ReadingExercise
                  hasQuiz={metadata.hasQuiz}
                  text={metadata.text}
                  attemptId={attemptId}
                  nextButton={metadata.isDue ? "disable" : "show"}
                />
              ) : (
                <ExplainExercise
                  hasQuiz={metadata.hasQuiz}
                  writeDisabled={
                    metadata.status !== "exercise" || metadata.isDue
                  }
                  attemptId={attemptId}
                  nextButton={metadata.isDue ? "disable" : "show"}
                  succeeded={metadata.status === "quizCompleted"}
                />
              ))}

            {metadata.isSolutionShown && (
              <>
                {metadata.text ? (
                  <ReadingExercise
                    hasQuiz={metadata.hasQuiz}
                    text={metadata.text}
                    attemptId={attemptId}
                    nextButton="hide"
                  />
                ) : (
                  <ExplainExercise
                    hasQuiz={metadata.hasQuiz}
                    writeDisabled
                    attemptId={attemptId}
                    nextButton="hide"
                    succeeded={metadata.status === "quizCompleted"}
                  />
                )}

                {metadata.hasQuiz && (
                  <>
                    <hr className="mx-8 my-12" />

                    <QuizExercise
                      attemptId={attemptId}
                      title={metadata.exerciseName}
                      questions={metadata.quiz!}
                      lastSubmission={metadata.lastQuizSubmission}
                      succeeded={metadata.status === "quizCompleted"}
                      isDue={metadata.isDue}
                    />
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function RestartButton({ exerciseId }: { exerciseId: Id<"exercises"> }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className="absolute top-0 right-0">
        <Tooltip
          asChild
          side="bottom"
          sideOffset={-10}
          tip="Restart the conversation"
        >
          <button
            className="sm:w-16 sm:h-16 w-14 h-14 flex items-center justify-center"
            onClick={() => setIsModalOpen(true)}
          >
            <ArrowPathIcon className="w-6 h-6" />
          </button>
        </Tooltip>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Restart the exercise?"
      >
        <div className="mt-2">
          <p className="text-sm text-gray-500">
            If you’re experiencing issues, you can restart the exercise and try
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
            href={`/a/new?exerciseId=${exerciseId}`}
            variant="danger"
            size="sm"
          >
            Restart
          </Button>
        </div>
      </Modal>
    </>
  );
}
