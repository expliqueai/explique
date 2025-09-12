"use client";

import { useQuery } from "@/usingSession";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

interface TableData {
  headers: string[];
  rows: Array<{
    cells: Array<{
      value: string;
      rowSpan?: number;
      colSpan?: number;
    }>;
  }>;
  caption?: string;
}

interface ExtractedProblem {
  problemNumber: number;
  text: string;
  hasTable: boolean;
  tableData: TableData | null;
  hasGraph: boolean;
  graphDescription: string;
  pageNumber: number;
}

interface ExtractedProblemsDocument {
  _id: Id<"extractedProblems">;
  courseId: Id<"courses">;
  week: number;
  isAnswers: boolean;
  problems: ExtractedProblem[];
  createdAt: number;
  updatedAt: number;
}

export default function ExtractedProblemsList({ 
  courseSlug, 
  week 
}: { 
  courseSlug: string; 
  week: number; 
}) {
  const problems = useQuery(api.admin.sadatabase.getExtractedProblems, {
    courseSlug,
    week,
    isAnswers: false,
  });

  if (!problems) return <div>Loading...</div>;
  if (problems.length === 0) return <div>No problems found for this week.</div>;

  return (
    <div className="space-y-4">
      {problems.map((problemDoc) => (
        <div key={problemDoc._id} className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">
            Week {problemDoc.week} Problems
          </h3>
          <div className="space-y-4">
            {problemDoc.problems.map((problem) => (
              <div key={problem.problemNumber} className="border-b pb-4 last:border-b-0">
                <h4 className="font-medium text-gray-800">
                  Problem {problem.problemNumber}
                </h4>
                <div className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">
                  {problem.text}
                </div>
                {problem.hasTable && problem.tableData && (
                  <div className="mt-3">
                    <strong className="text-sm">Table:</strong>
                    <div className="bg-gray-50 p-3 rounded mt-1">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr>
                            {problem.tableData.headers.map((header, index) => (
                              <th key={index} className="border p-1 font-semibold">
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {problem.tableData.rows.map((row, rowIndex) => (
                            <tr key={rowIndex}>
                              {row.cells.map((cell, cellIndex) => (
                                <td key={cellIndex} className="border p-1">
                                  {cell.value}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {problem.tableData.caption && (
                        <div className="text-xs italic mt-1">
                          {problem.tableData.caption}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {problem.hasGraph && (
                  <div className="mt-3">
                    <strong className="text-sm">Graph Description:</strong>
                    <p className="text-sm text-gray-600 mt-1">
                      {problem.graphDescription}
                    </p>
                  </div>
                )}
                <div className="text-xs text-gray-500 mt-2">
                  Page {problem.pageNumber}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}