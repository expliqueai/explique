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
};

export function toConvexState(state: State) {
  return {
    name: state.name,
    image: state.image,
    weekId: state.weekId,
    url: state.url,
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

      <Input label="Youtube URL" value={url} onChange={setUrl} required />

      {/* {lectureId && (
        <ThumbnailPicker
          image={image}
          setImage={setImage}
          lectureId={lectureId}
          name={name}
        />
      )} */}

      <div className="h-36"></div>

      <div className="p-8 bg-white/60 backdrop-blur-xl fixed bottom-0 left-0 w-full flex justify-end shadow-2xl">
        <PrimaryButton type="submit">{submitLabel}</PrimaryButton>
      </div>
    </form>
  );
}
