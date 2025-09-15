"use client";

import { useMutation, useQuery } from "@/usingSession";
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { useState } from "react";
import { Button } from "@/components/Button";
import { toast } from "sonner";


export default function ProblemExtractionReview({
  problemSetId,
}: {
  problemSetId: Id<"problemSets">;
}) {
  const problems = useQuery(api.superassistant.problemExtraction.listProblemsForSet, {
    problemSetId,
  });
  const validate = useMutation(api.superassistant.problemExtraction.validateProblem);
  const [editing, setEditing] = useState<Record<string, string>>({});

  if (!problems) return <p className="text-gray-500">Loading…</p>;

  return (
    <div className="space-y-6">
      {problems.map((p) => (
        <div
          key={p._id}
          className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm"
        >
          <h3 className="mb-2 text-sm font-semibold text-slate-600">
            Page {p.pageNumber}
          </h3>
          <textarea
            className="w-full rounded border p-2 text-sm"
            value={editing[p._id] ?? p.validatedContent ?? p.rawExtraction}
            onChange={(e) =>
              setEditing((prev) => ({ ...prev, [p._id]: e.target.value }))
            }
            rows={6}
          />
          <div className="mt-3 flex justify-end gap-2">
            <Button
              size="sm"
              variant="primary"
              onClick={async () => {
                try {
                  await validate({
                    problemId: p._id as Id<"problems">,
                    validatedContent: editing[p._id] ?? p.rawExtraction,
                  });
                  toast.success("Problem validated");
                } catch (err) {
                  console.error(err);
                  toast.error("Failed to validate problem");
                }
              }}
            >
              Validate
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}