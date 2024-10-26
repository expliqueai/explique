"use client";

import { useAction, useQuery } from "@/usingSession";
import React from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import ExerciseForm, { toConvexState } from "@/components/ExerciseForm";
import Title from "@/components/typography";
import { toast } from "sonner";

export default function EditExercise() {
  const router = useRouter();
  const params = useParams();
  const update = useAction(api.admin.exercises.update);

  const exercise = useQuery(api.admin.exercises.get, {
    id: params.exerciseId as Id<"exercises">,
  });

  return (
    <div className="bg-slate-100 h-full p-10 flex justify-center">
      <div className="max-w-6xl flex-1">
        <Title backHref="/admin">Edit Exercise</Title>

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
              api: exercise.chatCompletionsApi
                ? "chatCompletions"
                : "assistants",
              model: exercise.model,
              text: exercise.text,
              feedback: exercise.feedback ?? null,

              quizBatches:
                exercise.quiz === null
                  ? null
                  : exercise.quiz.batches.map((batch) => ({
                      questions: batch.questions.map((question) => {
                        if ("text" in question) {
                          return question;
                        }

                        const correctAnswersIndexes = question.answers.flatMap(
                          (a, i) => (a.correct ? [i] : []),
                        );

                        return {
                          question: question.question,
                          randomize: question.randomize ?? true,
                          answers: question.answers.map((a) => a.text),
                          correctAnswerIndex:
                            correctAnswersIndexes.length === 1
                              ? correctAnswersIndexes.at(0)
                              : correctAnswersIndexes,
                        };
                      }),
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
                id: exercise._id,
                ...toConvexState(state),
              });
              toast.success("Exercise updated successfully.");
              router.push("/admin");
            }}
          />
        )}
      </div>
    </div>
  );
}
