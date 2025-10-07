"use client";

import { useQuery, useMutation } from "@/usingSession";
import { useParams, useRouter } from "next/navigation";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import Title from "@/components/typography";
import { toast } from "sonner";
import { useCourseSlug } from "@/hooks/useCourseSlug";
import { useState, useEffect } from "react";
import { Button } from "@/components/Button";
import Markdown from "@/components/Markdown";

export default function EditProblem() {
  const router = useRouter();
  const params = useParams();
  const courseSlug = useCourseSlug();

  const problemId = params.problemId as Id<"problems">;

  const problem = useQuery(api.superassistant.problem.get, { problemId });
  const updateProblem = useMutation(api.superassistant.problem.updateProblem);

  const [draftName, setDraftName] = useState("");
  const [draftInstructions, setDraftInstructions] = useState("");
  const [draftSolution, setDraftSolution] = useState("");
  const [draftMandatory, setDraftMandatory] = useState(false);

  useEffect(() => {
    if (problem) {
      setDraftName(problem.name ?? "");
      setDraftInstructions(problem.instructions ?? "");
      setDraftSolution(problem.solutions ?? "");
      setDraftMandatory(problem.mandatory ?? false);
    }
  }, [problem]);

  if (problem === undefined) {
    return <p className="p-6">Loading problem…</p>;
  }

  if (problem === null) {
    return <p className="p-6">Problem not found</p>;
  }

  const handleSave = async () => {
    await updateProblem({
      problemId,
      name: draftName,
      instructions: draftInstructions,
      solutions: draftSolution,
      mandatory: draftMandatory,
    });
    toast.success("Problem updated successfully.");
    router.push(`/${courseSlug}/admin/exercises`);
  };

  return (
    <div className="bg-slate-100 h-full p-10 flex justify-center">
      <div className="max-w-4xl flex-1">
        <Title backHref={`/${courseSlug}/admin/exercises`}>Edit Problem</Title>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
          className="space-y-6 bg-white rounded-2xl shadow p-6"
        >
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1">
              Problem Name
            </label>
            <input
              type="text"
              className="w-full border rounded-lg p-2"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1">
              Statement
            </label>
            <textarea
              className="w-full border rounded-lg p-2 font-mono"
              rows={6}
              value={draftInstructions}
              onChange={(e) => setDraftInstructions(e.target.value)}
              placeholder="Write your problem using Markdown or LaTeX"
              required
            />
            <div className="mt-2 rounded-lg border border-slate-200 bg-gray-50 p-3">
              <Markdown text={draftInstructions || ""} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 mb-1">
              Solution (optional)
            </label>
            <textarea
              className="w-full border rounded-lg p-2 font-mono"
              rows={5}
              value={draftSolution}
              onChange={(e) => setDraftSolution(e.target.value)}
              placeholder="Write your solution using Markdown or LaTeX (optional)"
            />
            <div className="mt-2 rounded-lg border border-slate-200 bg-gray-50 p-3">
              <Markdown text={draftSolution || ""} />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draftMandatory}
              onChange={(e) => setDraftMandatory(e.target.checked)}
            />
            Mandatory Problem
          </label>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => router.push(`/${courseSlug}/admin/exercises`)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Save
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}