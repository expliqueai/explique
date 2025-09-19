"use client";

import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@/usingSession";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { ArrowLeft, Star, Trash2, Pencil } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { useState } from "react";

export default function ProblemSetPage({
  params,
}: {
  params: { courseSlug: string; problemSetId: Id<"problemSets"> };
}) {
  const router = useRouter();
  const { courseSlug, problemSetId } = params;

  const problemSet = useQuery(api.superassistant.problemExtraction.getProblemSet, {
    problemSetId,
  });
  const problems = useQuery(api.superassistant.problemExtraction.listProblemsForSet, {
    problemSetId,
  });

  const validateProblem = useMutation(api.superassistant.problemExtraction.validateProblem);
  const deleteProblem = useMutation(api.superassistant.problemExtraction.deleteProblem);
  //const reorderProblems = useMutation(api.superassistant.problemExtraction.reorderProblems);
  const toggleStar = useMutation(api.superassistant.problemExtraction.toggleStarProblem);

  const [editingId, setEditingId] = useState<Id<"problems"> | null>(null);
  const [draftText, setDraftText] = useState("");
  const [draftNumber, setDraftNumber] = useState("");
  const week = useQuery(api.superassistant.problemExtraction.getWeek, { weekId: problemSet?.weekId });
  

  if (!problemSet) return <div>Loading…</div>;
  if (!problems) return <div>Loading problems…</div>;

  const handleSave = async (id: Id<"problems">) => {
    const content = JSON.stringify({
      number: draftNumber,
      statement: draftText,
    });

    await validateProblem({ problemId: id, validatedContent: content });
    setEditingId(null);
  };

  const handleDelete = async (id: Id<"problems">) => {
    if (confirm("Delete this problem?")) {
      await deleteProblem({ problemId: id });
    }
  };

  const handleStar = async (id: Id<"problems">) => {
    await toggleStar({ problemId: id });
  };

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;
    const from = result.source.index;
    const to = result.destination.index;
    // if (from !== to) {
    //   await reorderProblems({ problemSetId, from, to });
    // }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => router.push(`/${courseSlug}/admin/exercises`)}
        className="flex items-center text-slate-600 hover:text-slate-900 mb-4"
      >
        <ArrowLeft className="w-5 h-5 mr-2" />
        Back
      </button>

      <h1 className="text-2xl font-bold mb-4">{problemSet.name}</h1>
      <div className="text-sm text-gray-500 mb-6">
        Problems for Week: {week?.name ?? "Unknown"}
        </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="problems">
          {(provided) => (
            <div className="space-y-6" ref={provided.innerRef} {...provided.droppableProps}>
              {problems
                //.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                .map((prob, idx) => {
                  const parsed = JSON.parse(
                    prob.validatedContent ?? prob.rawExtraction
                  );

                  return (
                    <Draggable draggableId={prob._id} index={idx} key={prob._id}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className="bg-white rounded-xl shadow p-4 text-gray-900 relative"
                        >
                          {/* Star toggle */}
                          <button
                            onClick={() => handleStar(prob._id)}
                            className="absolute -top-2 -left-2 text-yellow-500"
                          >
                            <Star
                              className={`w-5 h-5 ${
                                prob.starred ? "fill-yellow-400" : "stroke-current"
                              }`}
                            />
                          </button>

                          {editingId === prob._id ? (
                            <div>
                              {/* Editable number */}
                              <input
                                type="text"
                                className="font-bold text-lg mb-2 border rounded p-1 w-full"
                                value={draftNumber}
                                onChange={(e) => setDraftNumber(e.target.value)}
                              />

                              {/* Editable statement */}
                              <textarea
                                className="w-full border rounded p-2"
                                value={draftText}
                                onChange={(e) => setDraftText(e.target.value)}
                                rows={5}
                              />
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
                                  Exercise {parsed.number}
                                </h3>
                                <button
                                  className="text-slate-500 hover:text-slate-700"
                                  onClick={() => {
                                    setEditingId(prob._id);
                                    setDraftNumber(parsed.number ?? "");
                                    setDraftText(parsed.statement ?? "");
                                  }}
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                              </div>

                              <ReactMarkdown
                                remarkPlugins={[remarkMath]}
                                rehypePlugins={[rehypeKatex]}
                                className="prose prose-sm max-w-none"
                              >
                                {parsed.statement}
                              </ReactMarkdown>
                            </>
                          )}

                          {/* Delete button */}
                          <button
                            onClick={() => handleDelete(prob._id)}
                            className="absolute bottom-3 right-3 text-red-500"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </Draggable>
                  );
                })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}