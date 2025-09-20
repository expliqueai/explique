"use client";

import { useQuery } from "@/usingSession";
import { api } from "@/../convex/_generated/api";
import { Id } from "@/../convex/_generated/dataModel";
import Link from "next/link";
import type { Problem } from "@/../convex/superassistant/problem";

export default function ProblemSolvingColumn({ week }: { week: Id<"weeks"> }) {
  const problems = useQuery(api.superassistant.problem.listByWeek, { weekId: week }) as
    | Problem[]
    | undefined;

  if (!problems) return <div>Loading…</div>;
  if (problems.length === 0) return <div>No problems yet for this week.</div>;

  return (
    <>
      {problems.map((problem) => (
        <div
          key={problem.id}
          className="block shadow-lg transition hover:scale-105 hover:shadow-2xl group rounded-3xl"
        >
          <div className="relative pb-[57.14%]">
            <div className="rounded-3xl overflow-hidden absolute inset-0 focus-within:ring-8 bg-[#B68585]">
              <Link
                href={`/${problem.weekId}/problems/${problem.id}`} 
                className="absolute inset-0 flex p-4 text-white items-end focus:outline-none"
              >
                <h2 className="font-semibold text-xl text-shadow-lg [text-wrap:balance]">
                  {problem.name || "Untitled Problem"}
                </h2>
              </Link>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}