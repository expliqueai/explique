import { ArrowRightIcon } from "@heroicons/react/16/solid";
import { Id } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import { useMutation } from "@/usingSession";
import Markdown from "../Markdown";
import { PrimaryButton } from "../PrimaryButton";
import Instruction from "../Instruction";

export default function ReadingExercise({
  hasQuiz,
  text,
  attemptId,
  nextButton,
}: {
  hasQuiz: boolean;
  text: string;
  attemptId: Id<"attempts">;
  nextButton: "show" | "hide" | "disable";
}) {
  const goToQuiz = useMutation(api.attempts.goToQuiz);

  return (
    <>
      <Instruction variant="success">
        <strong>Read the following text.</strong>
      </Instruction>

      <Markdown text={text} />

      <footer className="flex justify-center mt-8">
        {nextButton !== "hide" && (
          <div className="flex flex-col gap-2 items-center">
            <PrimaryButton
              onClick={async () => {
                await goToQuiz({ attemptId });
              }}
              disabled={nextButton === "disable"}
            >
              Continue to the quiz
              <ArrowRightIcon className="w-5 h-5" />
            </PrimaryButton>

            {nextButton === "disable" && (
              <p className="text-lg justify-center gap-1 text-red-600">
                The due date for this exercise has passed.
              </p>
            )}
          </div>
        )}
      </footer>
    </>
  );
}
