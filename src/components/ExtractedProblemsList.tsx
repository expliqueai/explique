"use client";

import { useQuery, useMutation } from "@/usingSession";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";

type Props = {
  courseSlug: string;
  weekId: Id<"weeks">;
};

export default function ExtractedProblemsList({ courseSlug, weekId }: Props) {
  const router = useRouter();

  const problemSets = useQuery(
    api.superassistant.problemExtraction.listProblemSetsByWeek,
    { weekId }
  );
  const deleteProblemSet = useMutation(api.superassistant.problemExtraction.deleteProblemSet);

  const [confirmingId, setConfirmingId] = useState<Id<"problemSets"> | null>(null);

  if (problemSets === undefined) return <div>Loading…</div>;
  if (problemSets.length === 0)
    return <div className="text-gray-500">No problem sets ready for this week.</div>;

  const handleDelete = async (id: Id<"problemSets">) => {
    await deleteProblemSet({ problemSetId: id });
    setConfirmingId(null);
  };

  return (
    <div className="mt-3 grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {problemSets.map((ps) => (
        <div key={ps._id} className="relative col-span-full">
          <button
            type="button"
            onClick={() => router.push(`/${courseSlug}/admin/problem-sets/${ps._id}`)}
            className="w-full rounded-3xl bg-slate-700/90 p-6 text-left shadow-lg transition hover:bg-slate-700 min-h-[8rem]"
          >
            <div className="text-xl font-bold text-white">{ps.name ?? "Problem set"}</div>
            <div className="mt-2 text-base text-slate-200/85">______</div>
          </button>

          <button
            onClick={() => setConfirmingId(ps._id)}
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
              Delete Problem Set?
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete this problem set and all its associated problems?
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