"use client";

import { useState } from "react";
import clsx from "clsx";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Input from "@/components/Input";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import UploadWithImage from "@/components/UploadWithImage";
import { useCourseSlug } from "@/hooks/useCourseSlug";
import { useFileUpload } from "@/hooks/useFileUpload";
import { useMutation } from "@/usingSession";
import { api } from "@/../convex/_generated/api";
import { Id } from "@/../convex/_generated/dataModel";
import { CheckCircleIcon } from "@heroicons/react/24/solid";
import { ClockIcon } from "@heroicons/react/24/outline";

type Progress = "not_started" | "in_progress" | "completed";
type ExerciseItem = { id: string; name: string; description: string };

function StatusIcon({ status }: { status: Progress }) {
  return status === "completed" ? (
    <CheckCircleIcon className="h-5 w-5 text-emerald-400 drop-shadow" />
  ) : (
    <ClockIcon className="h-5 w-5 text-amber-400 drop-shadow" />
  );
}

function ExerciseBlob({
  title,
  snippet,
  status = "not_started",
  onClick,
}: {
  title: string;
  snippet: string;
  status?: Progress;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative block w-full rounded-3xl bg-slate-700/90 p-4 text-left shadow-[0_12px_36px_-12px_rgba(0,0,0,.35)] transition hover:bg-slate-700"
      title={`Upload for ${title}`}
    >
      <div className="pointer-events-none absolute right-3 top-3">
        <StatusIcon status={status} />
      </div>

      <div className="text-base font-semibold text-white">{title}</div>
      <div
        className={clsx(
          "mt-1 text-sm text-slate-200/85",
          "line-clamp-2 overflow-hidden text-ellipsis [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical]"
        )}
      >
        {snippet}
      </div>
    </button>
  );
}

export default function ProblemSolvingColumn({ weekNumber }: { weekNumber: number }) {
  const courseSlug = useCourseSlug();
  const router = useRouter();

  const [statusByExercise, setStatusByExercise] = useState<Record<string, Progress>>({});
  const getStatus = (exId: string): Progress => statusByExercise[exId] ?? "not_started";
  const setStatus = (exId: string, s: Progress) =>
    setStatusByExercise((prev) => ({ ...prev, [exId]: s }));

  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [pickedExercise, setPickedExercise] = useState<ExerciseItem | null>(null);
  const [note, setNote] = useState("");

  const generateFeedback = useMutation(api.feedback.generateFeedback);
  const generateUploadUrl = useMutation(api.feedback.generateUploadUrl);
  const { startUpload } = useFileUpload(() => generateUploadUrl({}));
  const generateChat = useMutation(api.superassistant.chat.generateChat);

  const exercises: ExerciseItem[] = [1, 2, 3].map((i) => ({
    id: `${weekNumber}-${i}`,
    name: `Exercise ${i}`,
    description:
      `This will be the description for problem ${i} of Week ${weekNumber}. ` +
      `When the teacher uploads a PDF, we’ll extract the first sentences here.`,
  }));

  const onPick = (ex: ExerciseItem) => {
    setPickedExercise(ex);
    setStatus(ex.id, "in_progress");
    setIsOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="inline-flex items-center rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-white">
        Open-Ended Problems
      </div>

      <div className="grid grid-cols-1 gap-4">
        {exercises.map((ex) => {
          const status = getStatus(ex.id);
          const snippet = ex.description.length > 140 ? ex.description.slice(0, 140) + "…" : ex.description;
          return (
            <ExerciseBlob
              key={ex.id}
              title={ex.name}
              snippet={snippet}
              status={status}
              onClick={() => onPick(ex)}
            />
          );
        })}
      </div>

      <Modal
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
          setFile(null);
          setNote("");
        }}
        title={
          pickedExercise
            ? `Upload for Week ${weekNumber} — ${pickedExercise.name}`
            : "Upload your attempt"
        }
      >
        {pickedExercise && (
          <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-800">
            {pickedExercise.description}
          </div>
        )}

        <form
            onSubmit={async (e) => {
                e.preventDefault();
                if (!file || !pickedExercise) {
                toast.error("Please pick an exercise and upload an image.");
                return;
                }

                const uploaded = await startUpload([file]);
                const storageId = (uploaded[0].response as { storageId: string })
                .storageId as Id<"_storage">;

                const feedbackId = await generateFeedback({
                courseSlug,
                storageId,
                name: `${pickedExercise.name} — Week ${weekNumber}`,
                weekNumber,
                });

                const chatId = await generateChat({
                courseSlug,
                reason: note || `Discussion for ${pickedExercise.name} (Week ${weekNumber})`,
                name: `${pickedExercise.name} (Week ${weekNumber})`,
                weekNumber,
                });

                if (feedbackId) {
                setStatus(pickedExercise.id, "completed");
                router.push(`/${courseSlug}/super-assistant/feedback/${feedbackId}`);
                } else if (chatId) {
                setStatus(pickedExercise.id, "completed");
                router.push(`/${courseSlug}/super-assistant/chat/${chatId}`);
                } else {
                toast.error("Failed to generate feedback/chat.");
                return;
                }

                setIsOpen(false);
                setFile(null);
                setNote("");
            }}
            >


    
          <UploadWithImage value={file} onChange={setFile} />
          <div className="mt-4">
            <Input
              label="Add a note for the assistant (optional):"
              placeholder="What do you want help with?"
              value={note}
              onChange={setNote}
            />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setIsOpen(false);
                setFile(null);
                setNote("");
              }}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!file}>
              Upload & Continue
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
