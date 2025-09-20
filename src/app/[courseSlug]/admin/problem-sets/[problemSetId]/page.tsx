"use client";

import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@/usingSession";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { ArrowLeft, Star, Trash2, Pencil } from "lucide-react";
import { useState } from "react";

export default function ProblemsPage({
  params,
}: {
  params: { courseSlug: string; weekId: Id<"weeks"> };
}) {
  const router = useRouter();
  const { courseSlug, weekId } = params;

  const week = useQuery(api.admin.weeks.get, { weekId });
  const problems = useQuery(api.superassistant.problems.listByWeek, { weekId });

  const createProblem = useMutation(api.superassistant.problems.createProblem);
  const updateProblem = useMutation(api.superassistant.problems.updateProblem);
  const deleteProblem = useMutation(api.superassistant.problems.deleteProblem);
  const toggleMandatory = useMutation(api.superassistant.problems.toggleMandatory);

  const [editingId, setEditingId] = useState<Id<"problems"> | null>(null);
  const [draftNumber, setDraftNumber] = useState("");
  const [draftStatement, setDraftStatement] = useState("");
  const [draftSolution, setDraftSolution] = useState("");
  const [draftMandatory, setDraftMandatory] = useState(false);

  if (!problems) return <div>Loading problems…</div>;

  const handleSave = async (id: Id<"problems">) => {
    await updateProblem({
      problemId: id,
      number: draftNumber,
      statement: draftStatement,
      solution: draftSolution,
      mandatory: draftMandatory,
    });
    setEditingId(null);
  };

  const handleDelete = async (id: Id<"problems">) => {
    if (confirm("Delete this problem?")) {
      await deleteProblem({ problemId: id });
    }
  };

  const handleMandatory = async (id: Id<"problems">) => {
    await toggleMandatory({ problemId: id });
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <button
        onClick={() => router.push(`/${courseSlug}/admin/exercises`)}
        className="flex items-center text-slate-600 hover:text-slate-900 mb-4"
      >
        <ArrowLeft className="w-5 h-5 mr-2" />
        Back
      </button>

      <h1 className="text-2xl font-bold mb-4">
        Problems for {week?.name ?? "Unknown Week"}
      </h1>

      <div className="space-y-6">
        {problems.map((prob) => (
          <div
            key={prob._id}
            className="bg-white rounded-xl shadow p-4 text-gray-900 relative"
          >
            <button
              onClick={() => handleMandatory(prob._id)}
              className="absolute -top-2 -left-2 text-yellow-500"
            >
              <Star
                className={`w-5 h-5 ${
                  prob.mandatory ? "fill-yellow-400" : "stroke-current"
                }`}
              />
            </button>

            {editingId === prob._id ? (
              <div>
                <input
                  type="text"
                  className="font-bold text-lg mb-2 border rounded p-1 w-full"
                  value={draftNumber}
                  onChange={(e) => setDraftNumber(e.target.value)}
                  placeholder="Problem number"
                />

                <textarea
                  className="w-full border rounded p-2 mb-2"
                  rows={4}
                  value={draftStatement}
                  onChange={(e) => setDraftStatement(e.target.value)}
                  placeholder="Problem statement"
                />

                <textarea
                  className="w-full border rounded p-2 mb-2"
                  rows={3}
                  value={draftSolution}
                  onChange={(e) => setDraftSolution(e.target.value)}
                  placeholder="Solution (optional)"
                />

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={draftMandatory}
                    onChange={(e) => setDraftMandatory(e.target.checked)}
                  />
                  Mandatory
                </label>

                <div className="mt-2 flex gap-2">
                  <button
                    className="px-3 py-1 bg-blue-500 text-white rounded"
                    onClick={() => handleSave(prob._id)}
                  >
                    Save
                  </button>
                  <button
                    className="px-3 py-1 bg-gray-300 rounded"
                    onClick={() => setEditingId(null)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-lg">
                    Exercise {prob.number}
                  </h3>
                  <button
                    className="text-slate-500 hover:text-slate-700"
                    onClick={() => {
                      setEditingId(prob._id);
                      setDraftNumber(prob.number ?? "");
                      setDraftStatement(prob.statement ?? "");
                      setDraftSolution(prob.solution ?? "");
                      setDraftMandatory(prob.mandatory ?? false);
                    }}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>

                <p className="mb-2 whitespace-pre-wrap">{prob.statement}</p>
                {prob.solution && (
                  <div className="text-sm text-slate-700 whitespace-pre-wrap">
                    <strong>Solution:</strong> {prob.solution}
                  </div>
                )}
              </>
            )}

            <button
              onClick={() => handleDelete(prob._id)}
              className="absolute bottom-3 right-3 text-red-500"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}