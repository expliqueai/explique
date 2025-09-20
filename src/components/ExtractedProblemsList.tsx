"use client";

import { useQuery, useMutation } from "@/usingSession";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useState } from "react";
import { Trash2 } from "lucide-react";

type Props = {
  courseSlug: string;
  weekId: Id<"weeks">;
};

export default function ProblemsList({ courseSlug, weekId }: Props) {
  const problems = useQuery(api.superassistant.problems.listByWeek, { weekId });
  const deleteProblem = useMutation(api.superassistant.problems.deleteProblem);

  const [confirmingId, setConfirmingId] = useState<Id<"problems"> | null>(null);

  if (problems === undefined) return <div>Loading…</div>;
  if (problems.length === 0)
    return <div className="text-gray-500">No problems for this week yet.</div>;

  const handleDelete = async (id: Id<"problems">) => {
    await deleteProblem({ problemId: id });
    setConfirmingId(null);
  };

  return (
    <div className="mt-3 grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {problems.map((p) => (
        <div
          key={p._id}
          className="relative rounded-2xl bg-slate-700/90 p-6 text-white shadow-lg hover:bg-slate-700 transition"
        >
          <div className="text-lg font-bold">
            Exercise {p.number ?? "?"}{" "}
            {p.mandatory && <span className="ml-2 text-yellow-400">(Mandatory)</span>}
          </div>
          <div className="mt-2 text-slate-300 line-clamp-3">{p.statement}</div>

          <button
            onClick={() => setConfirmingId(p._id)}
            className="absolute bottom-3 right-3 text-red-500 hover:text-red-700"
          >
            <Trash2 className="w-6 h-6" />
          </button>
        </div>
      ))}

      {confirmingId && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-lg">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Delete Problem?
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete this problem?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmingId(null)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmingId)}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Yes, delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}