import {
  CheckCircleIcon,
  InformationCircleIcon,
  ExclamationCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useId, useState } from "react";
import { ArrowRightIcon } from "@heroicons/react/16/solid";
import { useMutation } from "@/usingSession";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import Markdown from "../Markdown";
import { PrimaryButton } from "../PrimaryButton";

const ATTEMPT_TIMEOUT_MS = 1000 * 60 * 1;

export default function QuizExercise({
  attemptId,
  questions,
  lastSubmission,
  succeeded,
  isDue,
}: {
  attemptId: Id<"attempts">;
  questions: {
    question: string;
    answers: string[];
    correctAnswer: string | null;
  }[];
  lastSubmission: {
    answers: number[];
    timestamp: number;
  } | null;
  succeeded: boolean;
  isDue: boolean;
}) {
  const submit = useMutation(api.quiz.submit);

  const [selectedAnswerIndexes, setSelectedAnswerIndexes] = useState<
    (number | null)[]
  >(
    questions.map((_, i) =>
      lastSubmission ? lastSubmission.answers[i] : null,
    ),
  );

  const [timeoutSeconds, setTimeoutSeconds] = useState<null | number>(67);
  const disabled = succeeded || timeoutSeconds !== null || isDue;

  // Update the timer
  useEffect(() => {
    if (lastSubmission === null) {
      setTimeoutSeconds(null);
      return;
    }

    const update = () => {
      const elapsed = Date.now() - lastSubmission.timestamp;
      const remaining = ATTEMPT_TIMEOUT_MS - elapsed;
      setTimeoutSeconds(remaining >= 0 ? Math.floor(remaining / 1000) : null);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [lastSubmission]);

  return (
    <>
      <p className="sm:text-lg font-light flex items-center justify-center gap-1 my-8">
        <InformationCircleIcon
          className="w-6 h-6 text-purple-700"
          aria-hidden="true"
        />
        <span className="flex-1">
          <strong className="font-medium text-purple-700">
            Answer the following{" "}
            {questions.length === 1 ? "question" : "questions"}.
          </strong>
        </span>
      </p>

      <div className="flex flex-col gap-4">
        {questions.map(({ question, answers, correctAnswer }, index) => (
          <QuizContents
            key={index}
            question={question}
            answers={answers}
            selectedAnswerIndex={selectedAnswerIndexes[index]}
            correctAnswer={correctAnswer}
            onChange={(newSelectedIndex) => {
              const newIndexes = [...selectedAnswerIndexes];
              newIndexes[index] = newSelectedIndex;
              setSelectedAnswerIndexes(newIndexes);
            }}
            disabled={disabled}
          />
        ))}
      </div>

      <footer className="flex flex-col items-center my-8 gap-8">
        <PrimaryButton
          disabled={selectedAnswerIndexes.includes(null) || disabled}
          onClick={async () => {
            await submit({
              attemptId,
              answers: selectedAnswerIndexes.map((index) => {
                if (index === null) throw new Error("No answer selected");
                return index;
              }),
            });
          }}
        >
          Submit
          <ArrowRightIcon className="w-5 h-5" />
        </PrimaryButton>

        {!succeeded && !isDue && timeoutSeconds !== null && (
          <div>
            <p className="sm:text-lg font-light flex items-center justify-center gap-1">
              <ExclamationCircleIcon
                className="w-6 h-6 text-red-600"
                aria-hidden="true"
              />
              <span>
                <strong className="font-medium text-red-600">Oops!</strong> Your
                answer is incorrect. Please wait before trying again.
              </span>
            </p>
            <p className="text-center mt-2 text-3xl font-extralight tabular-nums text-gray-600">
              {Math.floor(timeoutSeconds / 60)
                .toString()
                .padStart(2, "0")}
              :{(timeoutSeconds % 60).toString().padStart(2, "0")}
            </p>
          </div>
        )}

        {succeeded && (
          <p className="sm:text-lg font-light flex items-center justify-center gap-1">
            <CheckCircleIcon
              className="w-6 h-6 text-purple-700"
              aria-hidden="true"
            />
            <span>
              <strong className="font-medium text-purple-700">
                Congratulations!
              </strong>{" "}
              You have finished this exercise.
            </span>
          </p>
        )}

        {!succeeded && isDue && (
          <p className="sm:text-lg font-light flex items-center justify-center gap-1">
            <ExclamationCircleIcon
              className="w-6 h-6 text-red-600"
              aria-hidden="true"
            />
            <span>This exercise due date has passed.</span>
          </p>
        )}
      </footer>
    </>
  );
}

export function QuizContents({
  question,
  answers,
  selectedAnswerIndex,
  correctAnswer,
  onChange,
  disabled = false,
}: {
  question: string;
  answers: string[];
  selectedAnswerIndex: number | null;
  correctAnswer: string | null;
  onChange?: (index: number) => void;
  disabled?: boolean;
}) {
  const id = useId();

  return (
    <div className="bg-white border rounded-xl p-4">
      <header>
        <Markdown
          className="text-xl prose-p:mt-0 prose-p:mb-1"
          text={question}
        />
      </header>

      <div>
        {answers.map((answer, index) => (
          <div key={index}>
            <label className="flex py-2">
              <div className="h-[1em] mr-2 box-content">
                <input
                  type="radio"
                  id={`${id}-${index}`}
                  name={id}
                  value={index}
                  checked={selectedAnswerIndex === index}
                  disabled={disabled}
                  onChange={(e) => onChange?.(parseInt(e.target.value, 10))}
                />
              </div>

              <Markdown text={answer} className="flex-1 prose-p:my-0" />

              {correctAnswer === answer && (
                <CheckCircleIcon
                  className="w-6 h-6 text-green-600"
                  title="Correct answer"
                />
              )}
              {correctAnswer !== null &&
                selectedAnswerIndex === index &&
                correctAnswer !== answer && (
                  <XCircleIcon
                    className="w-6 h-6 text-red-600"
                    title="Incorrect answer"
                  />
                )}
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
