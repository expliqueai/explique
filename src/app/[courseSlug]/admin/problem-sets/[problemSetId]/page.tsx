"use client";

import { useQuery } from "@/usingSession";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

export default function ProblemSetPage({
  params,
}: {
  params: { courseSlug: string; problemSetId: Id<"problemSets"> };
}) {
  const { courseSlug, problemSetId } = params;

  const problemSet = useQuery(api.superassistant.problemExtraction.getProblemSet, {
    problemSetId,
  });

  const problems = useQuery(api.superassistant.problemExtraction.listProblemsForSet, {
    problemSetId,
  });

  if (!problemSet) return <div>Loading…</div>;
  if (!problems) return <div>Loading problems…</div>;

  const grouped: Record<string, any[]> = {};
  for (const prob of problems) {
    try {
      const parsed = JSON.parse(prob.validatedContent ?? prob.rawExtraction);
      const num: string = parsed.number ?? "N/A";
      const baseNum = num.replace(/[a-z]$/i, "");
      if (!grouped[baseNum]) grouped[baseNum] = [];
      grouped[baseNum].push(parsed);
    } catch (err) {
      console.error("Parse error for problem", prob._id, err);
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">{problemSet.name}</h1>
      <div className="text-sm text-gray-500 mb-6">Status: {problemSet.status}</div>

      <div className="space-y-6">
        {Object.entries(grouped).map(([baseNum, subproblems]) => (
          <div key={baseNum} className="bg-white rounded-xl shadow p-4 text-gray-900">
            <h3 className="font-bold text-lg mb-3">Exercise {baseNum}</h3>

            {subproblems.map((p, idx) => (
              <div key={idx} className="mb-4 last:mb-0">
                {/[a-z]$/i.test(p.number) && (
                  <div className="font-semibold text-sm text-gray-600 mb-1">
                    Part {p.number}
                  </div>
                )}

                <ReactMarkdown
                  remarkPlugins={[remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                  className="prose prose-sm max-w-none"
                >
                  {p.statement}
                </ReactMarkdown>

                {p.equations && p.equations.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {p.equations.map((eq: string, i: number) => (
                      <ReactMarkdown
                        key={i}
                        remarkPlugins={[remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        className="prose prose-sm max-w-none"
                      >
                        {`$$${eq}$$`}
                      </ReactMarkdown>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}