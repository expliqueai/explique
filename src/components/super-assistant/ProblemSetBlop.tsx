"use client";

import { useQuery } from "@/usingSession";
import clsx from "clsx";
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"

export default function ProblemSetBlob({
  problemSetId,
  onClick,
}: {
  problemSetId: Id<"problemSets">;
  onClick?: () => void;
}) {
  const ps = useQuery(api.superassistant.problemExtraction.getProblemSet, {
    problemSetId,
  });

  if (!ps) return null;

  return (
    <button
      onClick={onClick}
      className={clsx(
        "w-full rounded-3xl p-4 text-left shadow transition",
        ps.status === "READY"
          ? "bg-green-50 hover:bg-green-100"
          : "bg-slate-100 hover:bg-slate-200"
      )}
    >
      <div className="flex justify-between">
        <h3 className="font-semibold text-slate-800">{ps.name}</h3>
        <span
          className={clsx(
            "rounded-full px-2 py-1 text-xs font-medium",
            ps.status === "READY"
              ? "bg-green-200 text-green-800"
              : "bg-yellow-200 text-yellow-800"
          )}
        >
          {ps.status}
        </span>
      </div>
      <p className="mt-1 text-sm text-slate-600">
        Week {ps.weekId} — Uploaded {new Date(ps.createdAt).toLocaleDateString()}
      </p>
    </button>
  );
}