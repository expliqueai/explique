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
import clsx from "clsx";
import { toast } from "sonner";
import { useCourseSlug } from "@/hooks/useCourseSlug";
import { PrimaryButton } from "./PrimaryButton";

export type State = {
  weekId: Id<"weeks">;
  name: string;
  image?: Id<"images">;
  url: string;
  firstMessage?: string;
};

export function toConvexState(state: State) {
  return {
    name: state.name,
    image: state.image,
    weekId: state.weekId,
    url: state.url,
    firstMessage: state.firstMessage,
  };
}

export default function LectureForm({
  lectureId,
  initialState,
  onSubmit,
  submitLabel,
}: {
  lectureId?: Id<"lectures">;
  initialState: State;
  onSubmit: (state: State) => void;
  submitLabel: string;
}) {
  const [name, setName] = useState(initialState.name);
  const [weekId, setWeekId] = useState(initialState.weekId);
  const [image, setImage] = useState(initialState.image);
  const [url, setUrl] = useState(initialState.url);
  const [firstMessage, setFirstMessage] = useState(
    initialState.firstMessage ?? "",
  );

  const courseSlug = useCourseSlug();
  const weeks = useQuery(convexApi.admin.weeks.list, { courseSlug });

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        onSubmit({
          name,
          image,
          weekId,
          url,
          firstMessage,
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

      <Input label="Video file URL" value={url} onChange={setUrl} required />

      {lectureId && (
        <ThumbnailPicker
          image={image}
          setImage={setImage}
          lectureId={lectureId}
          name={name}
        />
      )}

      <Textarea
        label="First message"
        value={firstMessage}
        onChange={setFirstMessage}
        hint={
          <>
            This message will be sent automatically{" "}
            <strong>by the chatbot</strong> when accessing the lecture. This
            message will be visible to students.
          </>
        }
      />

      <div className="h-36"></div>

      <div className="p-8 bg-white/60 backdrop-blur-xl fixed bottom-0 left-0 w-full flex justify-end shadow-2xl">
        <PrimaryButton type="submit">{submitLabel}</PrimaryButton>
      </div>
    </form>
  );
}

function ThumbnailPicker({
  image,
  setImage,
  lectureId,
  name,
}: {
  image: Id<"images"> | undefined;
  setImage: (value: Id<"images"> | undefined) => void;
  lectureId: Id<"lectures">;
  name: string;
}) {
  const courseSlug = useCourseSlug();
  const images = useQuery(convexApi.admin.image.list, {
    courseSlug,
    lectureId,
  });
  const generateImage = useAction(convexApi.admin.imageGeneration.default);

  return (
    <div className="mb-6">
      <div className="block mb-1 text-sm font-medium text-slate-800">
        Thumbnail
      </div>

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
                `Generate a thumbnail for a lecture video about "${name}"`,
            );
            if (!answer) {
              return;
            }

            async function generate(prompt: string) {
              const imageId = await generateImage({
                prompt,
                lectureId,
                courseSlug,
              });

              setImage(imageId);
            }

            toast.promise(generate(answer), {
              loading: "Generating thumbnail…",
              success: "Thumbnail generated",
            });
          }}
        >
          <PlusIconLarge className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
