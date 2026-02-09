"use client";

import { useMutation, useQuery } from "@/usingSession";
import { api } from "../../../../../../convex/_generated/api";
import { useCourseSlug } from "@/hooks/useCourseSlug";
import { WeekList } from "@/components/admin/WeekList";
import { toast } from "sonner";
import { ExerciseLinkWithMenu } from "@/components/admin/ExerciseLinkWithMenu";
import { useState } from "react";
import clsx from "clsx";

type Tab = "all" | "standard" | "open-problem";

export default function AdminExercisesPage() {
  const courseSlug = useCourseSlug();
  const weeks = useQuery(api.admin.exercises.list, { courseSlug });
  const deleteWeek = useMutation(api.admin.weeks.remove);
  const [activeTab, setActiveTab] = useState<Tab>("all");

  const filteredWeeks = weeks
    ?.map((week) => ({
      ...week,
      exercises: week.exercises.filter((ex) => {
        if (activeTab === "standard") return !ex.hasOpenProblem;
        if (activeTab === "open-problem") return ex.hasOpenProblem;
        return true;
      }),
    }))
;

  return (
    <div>
      <div className="mb-4 flex gap-1 border-b border-slate-200">
        {(
          [
            { key: "all", label: "All" },
            { key: "standard", label: "Standard" },
            { key: "open-problem", label: "Open Problems" },
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            className={clsx(
              "px-4 py-2 text-sm font-medium transition-colors",
              activeTab === key
                ? "border-b-2 border-purple-600 text-purple-700"
                : "text-slate-500 hover:text-slate-700"
            )}
            onClick={() => setActiveTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <WeekList
        title="Exercises"
        weeks={filteredWeeks?.map((week) => ({
          ...week,
          items: week.exercises,
        }))}
        onDeleteWeek={async (weekId) => {
          await deleteWeek({ id: weekId, courseSlug });
          toast.success("Week deleted successfully");
        }}
        renderItem={(exercise) => (
          <ExerciseLinkWithMenu key={exercise.id} exercise={exercise} />
        )}
        newItemPath="/admin/exercises/new"
        weekType="weeks"
      />
    </div>
  );
}
