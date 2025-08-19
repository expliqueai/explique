"use client"

import ExerciseForm, { toConvexState } from "@/components/ExerciseForm"
import Title from "@/components/typography"
import { useCourseSlug } from "@/hooks/useCourseSlug"
import { useAction, useQuery } from "@/usingSession"
import { useParams, useRouter } from "next/navigation"
import React from "react"
import { toast } from "sonner"
import { api } from "../../../../../../convex/_generated/api"
import { Id } from "../../../../../../convex/_generated/dataModel"

export default function EditExercise() {
  const router = useRouter()
  const params = useParams()
  const update = useAction(api.admin.exercises.update)
  const courseSlug = useCourseSlug()

  const exercise = useQuery(api.admin.exercises.get, {
    id: params.exerciseId as Id<"exercises">,
    courseSlug,
  })

  return (
    <div className="flex h-full justify-center bg-slate-100 p-10">
      <div className="max-w-6xl flex-1">
        <Title backHref={`/${courseSlug}/admin/exercises`}>Edit Exercise</Title>

        {exercise === null && <p>Not found</p>}
        {exercise && (
          <ExerciseForm
            exerciseId={exercise._id}
            submitLabel="Save"
            initialState={{
              weekId: exercise.weekId,
              name: exercise.name,
              image: exercise.image,
              imagePrompt: exercise.imagePrompt,
              instructions: exercise.instructions,
              text: exercise.text,
              feedback: exercise.feedback ?? null,

              quizBatches:
                exercise.quiz === null
                  ? null
                  : exercise.quiz.batches.map((batch) => ({
                      questions: batch.questions.map(
                        ({ question, answers }) => ({
                          question,
                          answers: answers.map((a) => a.text),
                          correctAnswerIndex: answers.findIndex(
                            (a) => a.correct
                          ),
                        })
                      ),
                      randomize:
                        typeof batch.randomize === "boolean"
                          ? batch.randomize
                          : true,
                    })),

              firstMessage: exercise.firstMessage ?? "",
              controlGroup: exercise.controlGroup,
              completionFunctionDescription:
                exercise.completionFunctionDescription,
            }}
            onSubmit={async (state) => {
              await update({
                courseSlug,
                id: exercise._id,
                exercise: toConvexState(state),
              })
              toast.success("Exercise updated successfully.")
              router.push(`/${courseSlug}/admin/exercises`)
            }}
          />
        )}
      </div>
    </div>
  )
}
