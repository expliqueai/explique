"use client";

import { useMutation, useQuery } from "@/usingSession";
import { api } from "../../../../../../convex/_generated/api";
import { useCourseSlug } from "@/hooks/useCourseSlug";
import { WeekList } from "@/components/admin/WeekList";
import { toast } from "sonner";
import { ExerciseLinkWithMenu } from "@/components/admin/ExerciseLinkWithMenu";
import ExtractedProblemsList from "@/components/ExtractedProblemsList";

export default function AdminExercisesPage() {
  const courseSlug = useCourseSlug();
  const weeks = useQuery(api.admin.exercises.list, { courseSlug });
  const deleteWeek = useMutation(api.admin.weeks.remove);

  return (
    <WeekList
      title="Exercises"
      weeks={weeks?.map((week) => ({
        ...week,
        items: week.exercises.map((ex: any) => ({ ...ex, weekId: week._id })),
      }))}
      onDeleteWeek={async (weekId) => {
        await deleteWeek({ id: weekId, courseSlug });
        toast.success("Week deleted successfully");
      }}
      renderItem={(exercise: any) => (
        <>
          <ExerciseLinkWithMenu key={exercise.id} exercise={exercise} />
          <div className="flex-1">
            <ExtractedProblemsList
              courseSlug={courseSlug}
              weekId={exercise.weekId}
            />
          </div>
        </>
      )}
      newItemPath="/admin/exercises/new"
      weekType="weeks"
    />
  );
}