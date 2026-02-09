"use client"

import ActivityHeader from "@/components/ActivityHeader"
import { Button } from "@/components/Button"
import ExplainExercise from "@/components/exercises/ExplainExercise"
import OpenProblemUpload from "@/components/exercises/OpenProblemUpload"
import QuizExercise from "@/components/exercises/QuizExercise"
import ReadingExercise from "@/components/exercises/ReadingExercise"
import Markdown from "@/components/Markdown"
import { Modal } from "@/components/Modal"
import Tooltip from "@/components/Tooltip"
import { useQuery } from "@/usingSession"
import { ArrowPathIcon } from "@heroicons/react/24/outline"
import { use, useState } from "react"
import { api } from "../../../../convex/_generated/api"
import { Id } from "../../../../convex/_generated/dataModel"

export default function Page({
  params,
}: {
  params: Promise<{ attemptId: string }>
}) {
  const resolvedParams = use(params)
  const attemptId = resolvedParams.attemptId as Id<"attempts">
  const metadata = useQuery(api.attempts.get, { id: attemptId })

  const isOpenProblemChat = !!(
    metadata?.openProblem && metadata.status !== "awaitingUpload"
  )

  const exerciseContent = metadata && metadata.status !== "awaitingUpload" && (
    <>
      {!metadata.isSolutionShown &&
        (metadata.quiz ? (
          <QuizExercise
            attemptId={attemptId}
            questions={metadata.quiz}
            lastSubmission={metadata.lastQuizSubmission}
            succeeded={metadata.status === "quizCompleted"}
            isDue={metadata.isDue}
          />
        ) : metadata.text ? (
          <ReadingExercise
            text={metadata.text}
            attemptId={attemptId}
            nextButton={metadata.isDue ? "disable" : "show"}
          />
        ) : (
          <ExplainExercise
            hasQuiz={metadata.hasQuiz}
            writeDisabled={metadata.status !== "exercise" || metadata.isDue}
            attemptId={attemptId}
            nextButton={metadata.isDue ? "disable" : "show"}
            succeeded={metadata.status === "quizCompleted"}
            containerMode={isOpenProblemChat}
          />
        ))}

      {metadata.isSolutionShown && (
        <>
          {metadata.text ? (
            <ReadingExercise
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
              containerMode={isOpenProblemChat}
            />
          )}

          {metadata.hasQuiz && (
            <>
              <hr className="mx-8 my-12" />

              <QuizExercise
                attemptId={attemptId}
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
  )

  const headerAction = metadata &&
    ((metadata.status === "exercise" && metadata.text === null) ||
      metadata.status === "awaitingUpload" ||
      metadata.isAdmin) &&
    !metadata.isDue && <RestartButton exerciseId={metadata.exerciseId} />

  // Open-problem chat: full-height two-column layout on desktop
  if (isOpenProblemChat) {
    return (
      <div className="lg:flex lg:h-dvh lg:flex-col lg:overflow-hidden">
        <div className="lg:shrink-0">
          <ActivityHeader
            goBackTo={
              metadata?.courseSlug ? `/${metadata.courseSlug}` : undefined
            }
            title={metadata?.exerciseName}
            isSolid
            action={headerAction}
          />
        </div>

        <div className="lg:flex lg:min-h-0 lg:flex-1 lg:gap-8 lg:px-8 lg:py-6">
          <div className="mb-6 lg:mb-0 lg:min-w-0 lg:flex-1 lg:overflow-hidden">
            <OpenProblemContext
              problemStatement={metadata.openProblem!.problemStatement}
              imageUrls={metadata.openProblemImageUrls}
            />
          </div>
          <div className="lg:w-[36rem] lg:shrink-0 lg:self-stretch lg:overflow-y-auto">
            <div className="p-4 lg:flex lg:min-h-full lg:flex-col">
              {exerciseContent}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Standard layout
  return (
    <div className="p-6">
      <div className="mx-auto max-w-xl">
        <ActivityHeader
          goBackTo={
            metadata?.courseSlug ? `/${metadata.courseSlug}` : undefined
          }
          title={metadata?.exerciseName}
          action={headerAction}
        />
        {metadata && (
          <>
            {metadata.status === "awaitingUpload" && metadata.openProblem && (
              <OpenProblemUpload
                attemptId={attemptId}
                problemStatement={metadata.openProblem.problemStatement}
              />
            )}

            {exerciseContent}
          </>
        )}
      </div>
    </div>
  )
}

function RestartButton({ exerciseId }: { exerciseId: Id<"exercises"> }) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <>
      <Tooltip
        asChild
        side="bottom"
        sideOffset={-10}
        tip="Restart the conversation"
      >
        <button
          className="flex h-10 w-10 items-center justify-center sm:h-12 sm:w-12"
          onClick={() => setIsModalOpen(true)}
        >
          <ArrowPathIcon className="h-6 w-6" />
        </button>
      </Tooltip>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Restart the exercise?"
      >
        <div className="mt-2">
          <p className="text-sm text-gray-500">
            If you&apos;re experiencing issues, you can restart the exercise and
            try again.
          </p>
        </div>

        <div className="mt-4 flex justify-end gap-2">
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
  )
}

function OpenProblemContext({
  problemStatement,
  imageUrls,
}: {
  problemStatement: string
  imageUrls: string[]
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 lg:flex lg:h-full lg:flex-col">
      <div className="lg:shrink-0">
        <h3 className="mb-2 text-sm font-medium tracking-wide text-slate-500 uppercase">
          Problem
        </h3>
        <div className="prose prose-sm max-w-none">
          <Markdown text={problemStatement} />
        </div>
      </div>
      {imageUrls.length > 0 && (
        <div className="mt-3 border-t border-slate-200 pt-3 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
          <h3 className="mb-2 text-sm font-medium tracking-wide text-slate-500 uppercase lg:shrink-0">
            My solution
          </h3>
          {imageUrls.length === 1 && (
            <div className="lg:min-h-0 lg:flex-1">
              <img
                src={imageUrls[0]}
                alt="Solution page 1"
                className="h-full w-full rounded border border-slate-200 object-cover"
              />
            </div>
          )}
          {imageUrls.length === 2 && (
            <div className="grid grid-cols-2 gap-2 lg:min-h-0 lg:flex-1">
              {imageUrls.map((url, i) => (
                <div
                  key={i}
                  className="overflow-hidden rounded border border-slate-200"
                >
                  <img
                    src={url}
                    alt={`Solution page ${i + 1}`}
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}
          {imageUrls.length === 3 && (
            <div className="flex gap-2 lg:min-h-0 lg:flex-1">
              <div className="flex-1 overflow-hidden rounded border border-slate-200">
                <img
                  src={imageUrls[0]}
                  alt="Solution page 1"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex flex-1 flex-col gap-2">
                {imageUrls.slice(1).map((url, i) => (
                  <div
                    key={i}
                    className="flex-1 overflow-hidden rounded border border-slate-200"
                  >
                    <img
                      src={url}
                      alt={`Solution page ${i + 2}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
