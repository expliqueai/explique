"use client";

import { useQuery } from "@/usingSession";
import { api } from "@/../convex/_generated/api";
import { Id } from "@/../convex/_generated/dataModel";

import Link from "next/link";



export default function ProblemSolvingColumn({ week }: { week: Id<"weeks"> }) {
  const problemSets = useQuery(api.superassistant.problemExtraction.listProblemSetsByWeek, { weekId: week });

  return (
    <>
      {problemSets?.map((problemSet) => {
        return (
          <div className="block shadow-lg transition hover:scale-105 hover:shadow-2xl group rounded-3xl">
            <div className="relative pb-[57.14%]">
              <div className="rounded-3xl overflow-hidden absolute inset-0 focus-within:ring-8 bg-[#B68585]">
                <Link
                  href={`/p/${problemSet._id}`}
                  className="absolute inset-0 flex p-4 text-white items-end focus:outline-none"
                >
                  <h2 className="font-semibold text-xl text-shadow-lg [text-wrap:balance]">
                    {problemSet.name}
                  </h2>
                </Link>
              </div>
            </div>
          </div>
        )
      })}
    </>
  );
}