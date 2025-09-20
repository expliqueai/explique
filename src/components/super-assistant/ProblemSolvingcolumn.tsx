"use client";

import { useQuery, useMutation } from "@/usingSession";
import { api } from "@/../convex/_generated/api";
import { Id } from "@/../convex/_generated/dataModel";
import { Problem, Status } from "../../../convex/superassistant/problem";
import { CheckCircleIcon } from "@heroicons/react/24/solid";
import { ClockIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/Modal";
import { useState, useId } from "react";
import { toast } from "sonner";
import { useFileUpload } from "@/hooks/useFileUpload";
import UploadWithImage from "@/components/UploadWithImage";
import Input from "@/components/Input";
import { Button } from "@/components/Button";




function StatusIcon({ status }: { status: Status }) {
  return status === "COMPLETED" ? (
    <CheckCircleIcon className="h-5 w-5 text-emerald-400 drop-shadow" />
  ) : status === "IN PROGRESS" ? (
    <ClockIcon className="h-5 w-5 text-amber-400 drop-shadow" />
  ) : (
    <></>
  );
};


function ExerciseBlob({
  title,
  snippet,
  status,
  onClick,
}: {
  title: string;
  snippet: string;
  status: Status;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx("group relative block w-full rounded-3xl text-left shadow-lg hover:shadow-2xl transition hover:scale-105",
                    status === "NOT STARTED" && "bg-[#B68585]",
                    status === "IN PROGRESS" && "bg-blue-700/90",
                    status === "COMPLETED" && "bg-green-700/90"
                )}
      title={`Upload for ${title}`}
    >
      <div className="relative w-full h-full pb-[57.14%]">
        <div className="rounded-3xl w-full h-full overflow-hidden p-4 absolute focus-within:ring-8">
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
        </div>
      </div>
    </button>
  );
};


export default function ProblemSolvingColumn({ week }: { week: Id<"weeks"> }) {
  const problems = useQuery(api.superassistant.problem.list, { weekId: week });
  const router = useRouter();
  const id = useId();

  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [pickedProblem, setPickedProblem] = useState<Problem | null>(null);
  const [note, setNote] = useState("");

  const generateAttempt = useMutation(api.superassistant.attempt.generateAttempt);
  const generateUploadUrl = useMutation(api.superassistant.attempt.generateUploadUrl);
  const { startUpload } = useFileUpload(() => generateUploadUrl({}));

  const onPick = async (problem: Problem) => {
    if (problem.status === "NOT STARTED") {
      setPickedProblem(problem);
      setIsOpen(true);
    } else {
      if (problem.attemptId) router.push(`/p/${problem.attemptId}`);
    }
  };


  return (
    <>
      {problems && problems.length > 0 && (
        <>
          <div className="inline-flex items-center rounded-full bg-gray-700 px-3 py-1 text-xs font-semibold text-white my-4">
            Open-Ended Problems
          </div>

          <div className="grid gap-6 md:grid-cols-4">
            {problems?.map((problem) => {
              return (
                <ExerciseBlob
                  key={problem.id}
                  title={problem.name}
                  snippet={problem.instructions}
                  status={problem.status}
                  onClick={() => onPick(problem)}
                />
              )
            })}
          </div>
        </>
      )}

      <Modal
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
          setFile(null);
          setNote("");
        }}
        title={pickedProblem ? pickedProblem.name : "Unnamed problem"}
      >
        {pickedProblem && (
          <div className="my-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-800">
            {pickedProblem.instructions}
          </div>
        )}

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!file || !pickedProblem) {
              toast.error("Please pick an exercise and upload an image.");
              return;
            }

            const uploaded = await startUpload([file]);
            const storageId = (uploaded[0].response as { storageId: string })
                              .storageId as Id<"_storage">;

            const attemptId = await generateAttempt({
              problemId: pickedProblem.id,
              storageId: storageId,
              name: pickedProblem.name,
            });

            if (attemptId) {
              router.push(`/p/${attemptId}`);
            } else {
              toast.error("Failed to generate feedback/chat.");
              return;
            }

            setIsOpen(false);
            setFile(null);
            setNote("");
          }}
        >

          <label
            htmlFor={id}
            className="block mt-10 text-sm font-medium text-slate-800"
          >
            Upload your tentative solution:
            <UploadWithImage 
              value={file}
              onChange={setFile}
            />
          </label>

          <div className="mt-6">
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
    </>
  );
}