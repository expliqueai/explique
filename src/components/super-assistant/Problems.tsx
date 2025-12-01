"use client";

import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@/usingSession";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useState } from "react";
import { Trash2, Star } from "lucide-react";
import Markdown from "@/components/Markdown";

type Props = {
  courseSlug: string;
  weekId: Id<"weeks">;
};

type ProblemDoc = {
  _id: Id<"problems">;
  weekId: Id<"weeks">;
  name?: string;
  instructions?: string;
  mandatory?: boolean;
};

export default function Problems({ courseSlug, weekId }: Props) {
  const router = useRouter();
  const problems = useQuery(api.superassistant.problem.listByWeek, { weekId }) as
    | ProblemDoc[]
    | undefined;

  const deleteProblem = useMutation(api.superassistant.problem.deleteProblem);
  const toggleMandatory = useMutation(api.superassistant.problem.toggleMandatory);
  const [confirmingId, setConfirmingId] = useState<Id<"problems"> | null>(null);

  if (!problems) return null;
  if (problems.length === 0) return null;

  return (
    <>
      {problems.map((p) => (
        <div
          key={p._id}
          className="w-full max-w-[280px] group relative rounded-2xl shadow-lg transition hover:scale-105 hover:shadow-2xl cursor-pointer"
          onClick={() => router.push(`/${courseSlug}/admin/problems/${p._id}`)}
        >
          <div className="relative pb-[57.14%] rounded-2xl bg-slate-700/90 overflow-hidden">
            <div className="absolute top-3 left-3 right-3 flex justify-between items-center z-20">
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  await toggleMandatory({ problemId: p._id });
                }}
                className="text-yellow-400"
                aria-label="Toggle mandatory"
              >
                <Star
                  className={`w-6 h-6 ${
                    p.mandatory ? "fill-yellow-400" : "stroke-current"
                  }`}
                />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmingId(p._id);
                }}
                className="text-red-400 hover:text-red-600"
                aria-label="Delete problem"
              >
                <Trash2 className="w-6 h-6" />
              </button>
            </div>

            <div className="absolute inset-0 flex flex-col justify-end p-4 text-white">
              <div className="text-lg font-bold truncate">{p.name || "Untitled"}</div>
              <div className="mt-0 text-gray-100/90 line-clamp-3">
                <div className="[&_*]:text-gray-100/90">
                  <Markdown text={p.instructions || ""} />
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}

      {confirmingId && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-lg">
            <h2 className="text-lg font-semibold mb-4">Delete Problem?</h2>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmingId(null)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (confirmingId) {
                    await deleteProblem({ problemId: confirmingId });
                    setConfirmingId(null);
                  }
                }}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Yes, delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}