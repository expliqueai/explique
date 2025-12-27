"use client";

import { useQuery, useMutation } from "@/usingSession";
import { api } from "@/../convex/_generated/api";
import { Id } from "@/../convex/_generated/dataModel";
import { Problem, Status } from "../../../convex/superassistant/problem";
import { CheckCircleIcon } from "@heroicons/react/24/solid";
import { ClockIcon } from "@heroicons/react/24/outline";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/Modal";
import { useState, useId } from "react";
import { toast } from "sonner";
import { useFileUpload } from "@/hooks/useFileUpload";
import UploadWithImage from "@/components/UploadWithImage";
import Input from "@/components/Input";
import { Button } from "@/components/Button";
import { ConvexError } from "convex/values";
import Markdown from "@/components/Markdown";





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
  showRestart,
  onClick,
  onRestart,
}: {
  title: string;
  snippet: string;
  status: Status;
  showRestart: boolean;
  onClick: () => void;
  onRestart: () => void;
}) {
  return (
    <div className="transition hover:scale-105">
    <button
      type="button"
      onClick={onClick}
      className={clsx("group relative block w-full rounded-3xl text-left shadow-lg hover:shadow-2xl",
                    status === "NOT STARTED" && "bg-slate-700/90",
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
         <div className="mt-1 text-sm text-white/90 prose-sm prose-invert leading-snug">
          <div className="max-h-[3.8em] overflow-hidden break-words [mask-image:linear-gradient(to_bottom,black_85%,transparent_100%)]">
            <Markdown text={snippet || ""} className="prose-invert prose-sm text-white/90" />
          </div>
        </div>
        </div>
      </div>
    </button>

    {showRestart && (
      <button
        onClick={onRestart}
        className="absolute bottom-2 right-2 p-1 rounded-full bg-white
                    shadow-md hover:bg-red-500 hover:text-white 
                    text-gray-700 transition"
      >
        <ArrowPathIcon className="w-3.5 h-3.5" />
      </button>
    )}
    </div>
  );
};


export default function ProblemSolvingColumn({ week }: { week: Id<"weeks"> }) {
  const problems = useQuery(api.superassistant.problem.list, { weekId: week });
  const router = useRouter();

  const [pickedProblem, setPickedProblem] = useState<Problem | null>(null);
  const [resetModalOpen, setResetModalOpen] = useState(false);

  const generateAttempt = useMutation(api.superassistant.attempt.generateAttempt);
  const resetAttempt = useMutation(api.superassistant.attempt.resetAttempt);

  const onPick = async (problem: Problem) => {
    if (problem.attemptId) {
      router.push(`/p/${problem.attemptId}`);
      return;
    }

    const attemptId = await generateAttempt({
      problemId: problem.id,
      storageId: undefined,
      name: problem.name,
    });

    if (!attemptId) {
      toast.error("Could not start the problem. Please try again.");
      return;
    }

    router.push(`/p/${attemptId}`);
  };


  return (
    <>
      {problems && problems.length > 0 && (
        <>
          <div className="inline-flex items-center justify-center rounded-full bg-gray-200 text-gray-800 px-8 py-4 text-base font-semibold shadow-sm ring-1 ring-gray-300 mt-9 mb-6">
            Solve problems
          </div>

          <div className="grid gap-6 md:grid-cols-4">
            {problems?.map((problem) => {
              const hasImages = problem.images && problem.images.length > 0;

              const displayStatus =
                problem.status === "COMPLETED"
                  ? "COMPLETED"
                  : hasImages
                  ? "IN PROGRESS"
                  : "NOT STARTED";

              return (
                <div key={problem.id} className="relative group">
                  <ExerciseBlob
                    title={problem.name}
                    snippet={problem.instructions}
                    status={displayStatus}
                    showRestart={(hasImages != undefined && hasImages) && problem.status !== "COMPLETED" && (problem.attemptId != undefined)}
                    onClick={() => onPick(problem)}
                    onRestart={() => {
                        setPickedProblem(problem);
                        setResetModalOpen(true);
                    }}
                  />
                </div>
              );
            })}
          </div>
        </>
      )}

      <Modal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title="Reset Attempt?"
      >
        <p className="text-sm text-slate-700 mb-4">
          This will permanently delete your current attempt and let you start again.
        </p>

        <div className="flex justify-end gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setResetModalOpen(false)}
          >
            Cancel
          </Button>

          <Button
            variant="danger"
            size="sm"
            onClick={async () => {
              if (!pickedProblem?.attemptId) return;

              await resetAttempt({ attemptId: pickedProblem.attemptId });
              toast.success("Attempt reset successfully!");
              setResetModalOpen(false);
            }}
          >
            Reset
          </Button>
        </div>
      </Modal>

    </>
  );
}