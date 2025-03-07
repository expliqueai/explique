import React, { useId, useState } from "react";
import Input, { Select, Textarea } from "@/components/Input";
import {
  EllipsisHorizontalIcon,
  ExclamationCircleIcon,
  PlusIcon,
} from "@heroicons/react/16/solid";
import { PlusIcon as PlusIconLarge } from "@heroicons/react/24/outline";
import { XMarkIcon } from "@heroicons/react/20/solid";
import { QuizContents } from "@/components/exercises/QuizExercise";
import Markdown from "@/components/Markdown";
import { Id } from "../../convex/_generated/dataModel";
import { api as convexApi } from "../../convex/_generated/api";
import { useAction, useQuery } from "@/usingSession";
import Chance from "chance";
import clsx from "clsx";
import { toast } from "sonner";
import { useCourseSlug } from "@/hooks/useCourseSlug";
import { PrimaryButton } from "./PrimaryButton";
import { Button } from "./Button";
import ChatBubble from "./ChatBubble";

type Question = {
  question: string;
  answers: string[];
  correctAnswerIndex: number | null;
};

export type Batch = { questions: Question[]; randomize: boolean };

export type State = {
  weekId: Id<"weeks">;
  name: string;
  instructions: string;
  model: string;
  api: "chatCompletions" | "assistants";
  text: string;
  image?: Id<"images">;
  imagePrompt?: string;

  quizBatches: Batch[] | null;
  feedback: {
    model: string;
    prompt: string;
  } | null;

  firstMessage: string;
  controlGroup: "A" | "B" | "all" | "none";
  completionFunctionDescription: string;
};

export function toConvexState(state: State) {
  return {
    name: state.name,
    image: state.image,
    imagePrompt: state.imagePrompt,
    instructions: state.instructions,
    model: state.model,
    text: state.text,
    weekId: state.weekId,
    chatCompletionsApi:
      state.api === "chatCompletions" ? (true as const) : undefined,

    feedback: state.feedback ?? undefined,

    quiz:
      state.quizBatches === null
        ? null
        : {
            batches: state.quizBatches.map((batch) => ({
              randomize: batch.randomize,
              questions: batch.questions.map(
                ({ question, answers, correctAnswerIndex }) => ({
                  question,
                  answers: answers.map((text, index) => ({
                    text,
                    correct: index === correctAnswerIndex,
                  })),
                }),
              ),
            })),
          },

    firstMessage: state.firstMessage,
    controlGroup: state.controlGroup,
    completionFunctionDescription: state.completionFunctionDescription,
  };
}

function MarkdownTip() {
  return (
    <>
      <a
        className="underline font-semibold"
        href="https://www.markdownguide.org/basic-syntax/"
        target="_blank"
      >
        Markdown
      </a>{" "}
      syntax is supported.
      <br />
      LaTeX is syntax is supported (e.g.{" "}
      <code className="font-mono text-gray-700">$\sqrt m$</code>).
    </>
  );
}

export default function ExerciseForm({
  exerciseId,
  initialState,
  onSubmit,
  submitLabel,
}: {
  exerciseId?: Id<"exercises">;
  initialState: State;
  onSubmit: (state: State) => void;
  submitLabel: string;
}) {
  const [name, setName] = useState(initialState.name);
  const [weekId, setWeekId] = useState(initialState.weekId);

  const [instructions, setInstructions] = useState(initialState.instructions);
  const [model, setModel] = useState(initialState.model);
  const [api, setApi] = useState(initialState.api);
  const [text, setText] = useState(initialState.text);
  const [image, setImage] = useState(initialState.image);

  const [quizBatches, setQuizBatches] = useState(initialState.quizBatches);

  const [firstMessage, setFirstMessage] = useState(initialState.firstMessage);
  const [controlGroup, setControlGroup] = useState(initialState.controlGroup);
  const [completionFunctionDescription, setCompletionFunctionDescription] =
    useState(initialState.completionFunctionDescription);

  const courseSlug = useCourseSlug();
  const weeks = useQuery(convexApi.admin.weeks.list, { courseSlug });

  const [feedback, setFeedback] = useState(initialState.feedback);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        onSubmit({
          name,
          instructions,
          api,
          image,
          model,
          text,
          weekId,
          quizBatches,
          firstMessage,
          controlGroup,
          completionFunctionDescription,
          feedback,
        });
      }}
    >
      <Input
        label="Name"
        value={name}
        onChange={setName}
        placeholder="Bogo Sort"
        required
      />

      {weeks && (
        <Select
          label="Week"
          value={weekId}
          onChange={(val) => setWeekId(val)}
          values={weeks.map((week) => ({ value: week.id, label: week.name }))}
        />
      )}

      {exerciseId && (
        <ThumbnailPicker
          image={image}
          setImage={setImage}
          exerciseId={exerciseId}
          name={name}
        />
      )}

      <Select
        label="Exercise repartition"
        value={controlGroup}
        onChange={(val) => setControlGroup(val)}
        values={[
          {
            value: "A",
            label:
              "Group A gets the reading exercise, Group B gets the explanation exercise",
          },
          {
            value: "B",
            label:
              "Group B gets the reading exercise, Group A gets the explanation exercise",
          },
          { value: "none", label: "Everyone gets the explanation exercise" },
          { value: "all", label: "Everyone gets the reading exercise" },
        ]}
      />

      <section>
        <h2 className="text-2xl font-medium mt-8 mb-4 border-t py-4 border-slate-300">
          Explanation Exercise
        </h2>
        <div className="grid md:grid-cols-2 gap-x-12">
          <Textarea
            label="First message"
            value={firstMessage}
            onChange={setFirstMessage}
            hint={
              <>
                This message will be sent automatically{" "}
                <strong>on the user’s behalf</strong> when starting the
                exercise. This message, and the one sent by the chat bot in
                reponse, will be visible to students.
              </>
            }
          />
          <div className="mt-6 flex justify-end items-start">
            {firstMessage.trim() && (
              <ChatBubble
                author="user"
                contents={{
                  type: "message",
                  message: firstMessage,
                }}
              />
            )}
          </div>
        </div>
        <Select
          label="Model"
          value={model}
          onChange={setModel}
          values={[
            "gpt-4o",
            "gpt-4",
            "gpt-4-turbo-preview",
            "gpt-4-0125-preview",
            "gpt-4-1106-preview",
            "gpt-4-0613",
            "gpt-3.5-turbo",
            "gpt-3.5-turbo-0125",
            "gpt-3.5-turbo-1106",
            "gpt-3.5-turbo-0613",
          ].map((value) => ({ value, label: value }))}
          hint={
            <>
              More information about the models can be found in the{" "}
              <a
                className="underline font-semibold"
                href="https://platform.openai.com/docs/models/overview"
                target="_blank"
              >
                OpenAI documentation
              </a>
              .
            </>
          }
        />

        <Select
          label="API"
          value={api}
          onChange={setApi}
          values={[
            { value: "chatCompletions", label: "Chat Completion API" },
            { value: "assistants", label: "Assistants API" },
          ]}
          hint={
            <>
              The Assistants API is less expensive but is rate-limited to 60
              requests per minute.
              {api === "assistants" &&
                initialState.api === "chatCompletions" && (
                  <>
                    <span className="block mt-1 text-red-600">
                      <ExclamationCircleIcon className="w-4 h-4 inline mr-1" />
                      Students that started an attempt when the Chat Completions
                      API was used will continue their attempt with the
                      Assistants API, but the Assistants API won’t be able to
                      read the previous messages of the conversation.
                    </span>
                  </>
                )}
            </>
          }
        />

        <Textarea
          label="Model instructions"
          value={instructions}
          onChange={setInstructions}
          required
          hint="Not visible to the students."
        />
        <Input
          label="Completion function description"
          value={completionFunctionDescription}
          onChange={setCompletionFunctionDescription}
          required
          hint={
            <>
              <a
                className="underline font-semibold"
                href="https://platform.openai.com/docs/guides/function-calling"
                target="_blank"
              >
                Function calling
              </a>{" "}
              is used to determine when the explanation exercise is complete.
            </>
          }
        />

        <label className="block mb-3 text-sm font-medium text-slate-800">
          <input
            type="checkbox"
            className="mr-2"
            checked={feedback !== null}
            onChange={(e) => {
              if (e.target.checked) {
                setFeedback({
                  model: "gpt-3.5-turbo",
                  prompt:
                    "You will be provided a conversation between a student and a chatbot, where the student had to explain the {ALGO} algorithm. Provide feedback to the student on whether their explanation is correct. Please address the student directly (e.g. “You have understood correctly the algorithm” and not “The student has understood correctly the algorithm”). The messages are delimited by XML tags. Do not include XML tags in your response. Keep your answer somewhat concise.",
                });
              } else {
                setFeedback(null);
              }
            }}
          />
          <h3 className="inline">Provide automatic feedback to the student</h3>
        </label>
        {feedback && (
          <div className="pl-6">
            <div className="grid md:grid-cols-2 gap-x-12">
              <div>
                <Select
                  label="Model"
                  value={feedback.model}
                  onChange={(m) => setFeedback({ ...feedback, model: m })}
                  values={[
                    "gpt-4o",
                    "gpt-4-1106-preview",
                    "gpt-4",
                    "gpt-4-0314",
                    "gpt-4-0613",
                    "gpt-4-32k",
                    "gpt-4-32k-0314",
                    "gpt-4-32k-0613",
                    "gpt-3.5-turbo",
                    "gpt-3.5-turbo-16k",
                    "gpt-3.5-turbo-0301",
                    "gpt-3.5-turbo-0613",
                    "gpt-3.5-turbo-1106",
                    "gpt-3.5-turbo-16k-0613",
                  ].map((value) => ({
                    value,
                    label: value,
                  }))}
                  hint={
                    <>
                      More information about the models can be found in the{" "}
                      <a
                        className="underline font-semibold"
                        href="https://platform.openai.com/docs/models/overview"
                        target="_blank"
                      >
                        OpenAI documentation
                      </a>
                      .
                    </>
                  }
                />
                <Textarea
                  label="System prompt"
                  value={feedback.prompt}
                  onChange={(prompt) => setFeedback({ ...feedback, prompt })}
                  required
                />{" "}
              </div>

              <div className="prose">
                <h4 className="text-xs uppercase tracking-wide text-slate-600">
                  System instructions
                </h4>
                <pre className="whitespace-pre-wrap">{feedback.prompt}</pre>
                <h4 className="text-xs uppercase tracking-wide text-slate-600">
                  Query
                </h4>
                <pre className="whitespace-pre-wrap">
                  {`<message from="student">${firstMessage}</message>\n\n`}
                  {`<message from="chatbot">`}
                  <div className="inline-flex items-center justify-center w-7 h-5 rounded bg-slate-600 text-slate-400 align-middle">
                    <EllipsisHorizontalIcon className="w-5 h-5" />
                  </div>
                  {`</message>\n\n`}
                  <div className="inline-flex items-center justify-center w-7 h-5 rounded bg-slate-600 text-slate-400 align-middle">
                    <EllipsisHorizontalIcon className="w-5 h-5" />
                  </div>
                </pre>
              </div>
            </div>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-2xl font-medium mt-8 mb-4 border-t py-4 border-slate-300">
          Reading Exercise
        </h2>
        <div className="grid md:grid-cols-2 gap-x-12">
          <Textarea
            label="Text"
            value={text}
            onChange={setText}
            hint={<MarkdownTip />}
            required
          />

          <div className="mt-6">
            <Markdown text={text} />
          </div>
        </div>
      </section>

      <section>
        <header className="flex flex-wrap justify-between items-center mt-8 mb-4 border-t py-4 border-slate-300">
          <label className="flex text-sm font-medium text-slate-800 items-center">
            <input
              type="checkbox"
              className="w-6 h-6 mr-1"
              checked={quizBatches !== null}
              onChange={(e) => {
                setQuizBatches(
                  e.target.checked
                    ? [
                        {
                          randomize: true,
                          questions: [
                            {
                              question: "Question",
                              answers: [
                                "Answer 1",
                                "Answer 2",
                                "Answer 3",
                                "Answer 4",
                              ],
                              correctAnswerIndex: null,
                            },
                          ],
                        },
                      ]
                    : null,
                );
              }}
            />
            <h2 className="text-2xl font-medium">Validation Quiz</h2>
          </label>

          {quizBatches && (
            <Button
              type="button"
              onClick={() => {
                setQuizBatches([
                  ...quizBatches,
                  {
                    randomize: true,
                    questions: [
                      {
                        question: "Question",
                        answers: [
                          "Answer 1",
                          "Answer 2",
                          "Answer 3",
                          "Answer 4",
                        ],
                        correctAnswerIndex: null,
                      },
                    ],
                  },
                ]);
              }}
            >
              <PlusIcon className="w-5 h-5" />
              New Batch
            </Button>
          )}
        </header>

        {quizBatches &&
          quizBatches.map((batch, batchIndex) => (
            <QuizBatch
              key={batchIndex}
              batch={batch}
              batchIndex={batchIndex}
              onChange={(newBatch) => {
                setQuizBatches((quizBatches) =>
                  (quizBatches ?? []).map((b, index) =>
                    index === batchIndex ? newBatch : b,
                  ),
                );
              }}
              canDelete={quizBatches.length > 1}
              onDelete={() => {
                setQuizBatches((quizBatches) =>
                  (quizBatches ?? []).filter(
                    (_, index) => index !== batchIndex,
                  ),
                );
              }}
            />
          ))}

        <p className="text-slate-500 mb-6 text-sm flex-1 gap-2">
          <MarkdownTip />
        </p>
      </section>

      <div className="h-36"></div>

      <div className="p-8 bg-white/60 backdrop-blur-xl fixed bottom-0 left-0 w-full flex justify-end shadow-2xl">
        <PrimaryButton type="submit">{submitLabel}</PrimaryButton>
      </div>
    </form>
  );
}

function QuizBatch({
  batch,
  batchIndex,
  onChange,
  canDelete,
  onDelete,
}: {
  batch: Batch;
  batchIndex: number;
  onChange: (batch: Batch) => void;
  canDelete: boolean;
  onDelete: () => void;
}) {
  const { questions, randomize } = batch;

  return (
    <div className="bg-gray-50 shadow-xl p-6 rounded-xl mb-8">
      <div className="flex flex-wrap items-center gap-4 mb-2">
        <div className="flex-1 flex flex-col gap-1">
          <h3 className="font-regular text-2xl text-gray-700">
            Batch #{batchIndex + 1}
            {canDelete && (
              <button
                type="button"
                className="ml-3 text-gray-500 hover:text-gray-700 transition-colors"
                onClick={() => {
                  onDelete();
                }}
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            )}
          </h3>
          <label className="py-1 flex items-center gap-2 text-gray-700">
            <input
              type="checkbox"
              checked={randomize}
              onChange={(e) => {
                onChange({
                  randomize: e.target.checked,
                  questions,
                });
              }}
            />{" "}
            Randomize the questions order
          </label>
        </div>

        <Button
          type="button"
          onClick={() => {
            onChange({
              randomize,
              questions: [
                ...questions,
                {
                  question: "Question",
                  answers: ["Answer 1", "Answer 2", "Answer 3", "Answer 4"],
                  correctAnswerIndex: null,
                },
              ],
            });
          }}
        >
          <PlusIcon className="w-5 h-5" />
          New Question
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        {batch.questions.map((question, questionIndex) => (
          <QuizQuestion
            key={questionIndex}
            question={question}
            onChange={(question) => {
              onChange({
                randomize,
                questions: questions.map((q, index) =>
                  index === questionIndex ? question : q,
                ),
              });
            }}
            showDeleteButton={questions.length > 1}
            onDelete={() => {
              onChange({
                randomize,
                questions: questions.filter(
                  (_, index) => index !== questionIndex,
                ),
              });
            }}
            batchNumber={batchIndex}
            questionNumber={questionIndex}
          />
        ))}
      </div>
    </div>
  );
}

function QuizQuestion({
  question,
  onChange,
  showDeleteButton,
  onDelete,
  batchNumber,
  questionNumber,
}: {
  question: Question;
  onChange: (question: Question) => void;
  showDeleteButton: boolean;
  onDelete: () => void;
  batchNumber: number;
  questionNumber: number;
}) {
  const correctAnswerName = useId();

  // Answers shuffling disabled
  //   const chance = new Chance(`${batchNumber} ${questionNumber} example order`);
  //   const shuffledAnswers = chance.shuffle(question.answers);

  return (
    <div>
      <hr className="my-4 -mx-6 border-slate-200" />

      <div className="grid md:grid-cols-2 gap-x-12">
        <div>
          <label className="block mb-6 text-sm font-medium text-slate-800">
            Question
            <div className="flex">
              <textarea
                className="mt-1 p-2 w-full border border-slate-300 rounded-md text-base disabled:bg-slate-200 disabled:cursor-not-allowed resize-y"
                value={question.question}
                onChange={(e) =>
                  onChange({ ...question, question: e.target.value })
                }
                required
              />
              {showDeleteButton && (
                <button
                  type="button"
                  className="ml-3 text-gray-500 hover:text-gray-700 transition-colors"
                  onClick={() => {
                    onDelete();
                  }}
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              )}
            </div>
          </label>

          <fieldset className="md:pl-6">
            <legend className="block text-sm font-medium text-slate-800">
              Answers
            </legend>
            {question.answers.map((answer, answerIndex) => (
              <div key={answerIndex} className="mb-1 flex">
                <label className="flex items-center w-8 px-2">
                  <input
                    type="radio"
                    name={correctAnswerName}
                    value={answerIndex}
                    checked={question.correctAnswerIndex === answerIndex}
                    onChange={() => {
                      onChange({
                        ...question,
                        correctAnswerIndex: answerIndex,
                      });
                    }}
                    required
                  />
                </label>

                <textarea
                  className="mt-1 p-2 w-full border border-slate-300 rounded-md text-base disabled:bg-slate-200 disabled:cursor-not-allowed flex-1 resize-y"
                  value={answer}
                  onChange={(e) => {
                    onChange({
                      ...question,
                      answers: question.answers.map((a, index) =>
                        index === answerIndex ? e.target.value : a,
                      ),
                    });
                  }}
                  required
                />

                {question.answers.length > 1 && (
                  <button
                    type="button"
                    className="ml-3 text-gray-500 hover:text-gray-700 transition-colors"
                    onClick={() => {
                      onChange({
                        ...question,
                        answers: question.answers.filter(
                          (_, index) => index !== answerIndex,
                        ),
                      });
                    }}
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              className="font-medium text-blue-800 flex items-center py-2"
              onClick={() => {
                onChange({
                  ...question,
                  answers: [...question.answers, ""],
                });
              }}
            >
              <div className="w-8 flex justify-center">
                <PlusIcon className="w-5 h-5" />
              </div>
              Add Answer
            </button>
          </fieldset>
        </div>

        <div className="mt-6">
          <QuizContents
            question={question.question}
            answers={question.answers}
            selectedAnswerIndex={null}
            correctAnswer={
              question.correctAnswerIndex === null
                ? null
                : question.answers[question.correctAnswerIndex]
            }
            disabled
          />
        </div>
      </div>
    </div>
  );
}

function ThumbnailPicker({
  image,
  setImage,
  exerciseId,
  name,
}: {
  image: Id<"images"> | undefined;
  setImage: (value: Id<"images"> | undefined) => void;
  exerciseId: Id<"exercises">;
  name: string;
}) {
  const courseSlug = useCourseSlug();
  const images = useQuery(convexApi.admin.image.list, {
    courseSlug,
    exerciseId,
  });
  const generateImage = useAction(convexApi.admin.imageGeneration.default);

  return (
    <div className="mb-6">
      <div className="block mb-1 text-sm font-medium text-slate-800">Image</div>

      <div className="flex gap-4 flex-wrap">
        <button
          type="button"
          className={clsx(
            "w-40 h-28 p-2 rounded-xl bg-slate-200 cursor-pointer hover:bg-slate-300 text-xl font-light transition-colors",
            image === undefined && "ring-4 ring-purple-500",
          )}
          onClick={() => setImage(undefined)}
        >
          None
        </button>

        {images?.map((i) => (
          <button
            key={i._id}
            type="button"
            className={clsx(
              "w-40 h-28 p-2 rounded-xl bg-slate-200 cursor-pointer hover:bg-slate-300 transition-colors",
              i._id === image && "ring-4 ring-purple-500",
            )}
            onClick={() => setImage(i._id)}
          >
            <picture>
              {i.thumbnails.map((t, tIndex) => (
                <source
                  key={tIndex}
                  srcSet={t.src}
                  type={t.type}
                  sizes={t.sizes}
                />
              ))}
              <img
                className="w-full h-full rounded-lg object-cover"
                src={
                  i.thumbnails.find((t) => t.type === "image/avif")?.src ??
                  i.src
                }
                alt={i.prompt}
                title={i.prompt}
              />
            </picture>
          </button>
        ))}

        <button
          type="button"
          className={clsx(
            "w-40 h-28 p-2 flex items-center justify-center rounded-xl bg-slate-200 cursor-pointer hover:bg-slate-300 text-xl font-light transition-colors",
          )}
          onClick={async () => {
            const answer = prompt(
              "Which prompt to use to generate the image?",
              (images ?? []).find((i) => i._id === image)?.prompt ??
                `Generate a cartoon-style image representing ${name}`,
            );
            if (!answer) {
              return;
            }

            async function generate(prompt: string) {
              const imageId = await generateImage({
                prompt,
                exerciseId,
                courseSlug,
              });

              setImage(imageId);
            }

            toast.promise(generate(answer), {
              loading: "Generating image…",
              success: "Image generated",
            });
          }}
        >
          <PlusIconLarge className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
