"use client";

import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import { CheckCircleIcon } from "@heroicons/react/24/solid";
import { ClockIcon } from "@heroicons/react/24/outline";
import { Problem, Status } from "../../../../convex/superassistant/problemExtraction";
import { useState, useId, useEffect } from "react";
import clsx from "clsx";
import { toast } from "sonner";
import Input from "@/components/Input";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import UploadWithImage from "@/components/UploadWithImage";
import { useCourseSlug } from "@/hooks/useCourseSlug";
import { useFileUpload } from "@/hooks/useFileUpload";
import { useMutation, useQuery } from "@/usingSession";
import { fetchQuery } from "convex/nextjs";



function StatusIcon({ status }: { status: Status }) {
  return status === "COMPLETED" ? (
    <CheckCircleIcon className="h-5 w-5 text-emerald-400 drop-shadow" />
  ) : status === "IN PROGRESS" ? (
    <ClockIcon className="h-5 w-5 text-amber-400 drop-shadow" />
  ) : (
    <></>
  );
}


function ExerciseBlob({
  title,
  snippet,
  status = "NOT STARTED",
  onClick,
}: {
  title: string;
  snippet: string;
  status?: Status;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx("group relative block w-full rounded-3xl p-4 text-left shadow-[0_12px_36px_-12px_rgba(0,0,0,.35)] transition",
                    status === "NOT STARTED" && "bg-slate-700/90 hover:bg-slate-700",
                    status === "IN PROGRESS" && "bg-blue-700/90 hover:bg-blue-700",
                    status === "COMPLETED" && "bg-green-700/90 hover:bg-green-700"
                )}
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


export default function Page({ params }: { params: { id: string } }) {
  const problemSetId = params.id as Id<"problemSets">;
  const problemsOfSet = useQuery(api.superassistant.problemExtraction.problemsOfSet, { problemSetId: problemSetId });
  const problemSetName = useQuery(api.superassistant.problemExtraction.getProblemSetName, { problemSetId: problemSetId });
  const getAttemptId = useMutation(api.superassistant.attempt.getAttemptId);
  
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
      const attemptId = await getAttemptId({ problemId: problem.id });
      if (attemptId) router.push(`/p/${problemSetId}/${attemptId}`);
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-xl mx-auto">
        <div className="grid grid-cols-1 gap-4">

          {problemsOfSet?.map((problem) => {
            return (
              <ExerciseBlob
                key={problem.id}
                title={problem.name}
                snippet={problem.statement}
                status={problem.status}
                onClick={() => onPick(problem)}
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
          title={problemSetName && pickedProblem ? (problemSetName + ": " + pickedProblem.name) : ""}
        >
          {pickedProblem && (
            <div className="my-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-800">
              {pickedProblem.statement}
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
                name: problemSetName + ": " + pickedProblem.name,
              });

              if (attemptId) {
                router.push(`/p/${problemSetId}/${attemptId}`);
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
      </div>
    </div>
  );
}
