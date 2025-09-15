"use client";

import { useQuery } from "@/usingSession";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useRouter } from "next/navigation";

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

  if (problemSets === undefined) return <div>Loading…</div>;
  if (problemSets.length === 0)
    return <div className="text-gray-500">No problem sets ready for this week.</div>;

  return (
    <div className="mt-3 grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {problemSets.map((ps) => (
        <button
          key={ps._id}
          type="button"
          onClick={() =>
            router.push(`/${courseSlug}/admin/problem-sets/${ps._id}`)
          }
          className="group relative block w-full rounded-3xl bg-slate-700/90 p-4 text-left shadow transition hover:bg-slate-700"
        >
          <div className="text-base font-semibold text-white">
            {ps.name ?? "Problem Set"}
          </div>
          <div className="mt-1 text-sm text-slate-200/85">
            Status: {ps.status}
          </div>
        </button>
      ))}
    </div>
  );
}