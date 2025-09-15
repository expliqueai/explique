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
          <div key={ps._id} className="col-span-full">
            <button
            type="button"
            onClick={() => router.push(`/${courseSlug}/admin/problem-sets/${ps._id}`)}
            className="w-full rounded-3xl bg-slate-700/90 p-6 text-left shadow-lg transition hover:bg-slate-700 min-h-[8rem]"
            >
            <div className="text-xl font-bold text-white">{ps.name ?? "Problem set"}</div>
            <div className="mt-2 text-base text-slate-200/85">______</div>
            </button>
          </div>
       ))}
    </div>
  );
}