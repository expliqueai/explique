"use client";

import { useMutation, useQuery } from "@/usingSession";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel"
import { useCourseSlug } from "@/hooks/useCourseSlug";
import { WeekList } from "@/components/admin/WeekList";
import { toast } from "sonner";
import { ExerciseLinkWithMenu } from "@/components/admin/ExerciseLinkWithMenu";
import Problems from "@/components/super-assistant/Problems";

export default function AdminExercisesPage() {
  const courseSlug = useCourseSlug();
  const weeksRaw = useQuery(api.admin.exercises.list, { courseSlug });
  const deleteWeek = useMutation(api.admin.weeks.remove);

  const weeks =
    weeksRaw?.map((week) => {
      const exercises = (week.items ?? []).filter((it) => it.type === "exercise");
      return {
        ...week,
        items: [
          ...exercises,
          { type: "problemsFooter", id: `problems-${week._id}`, weekId: week._id },
        ],
      };
    }) ?? [];

  return (
    <WeekList
      title="Exercises"
      weeks={weeks}
      onDeleteWeek={async (weekId) => {
        await deleteWeek({ id: weekId, courseSlug });
        toast.success("Week deleted successfully");
      }}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      renderItem={(item: any) => {
        if (item.type === "exercise") {
          return (
            <ExerciseLinkWithMenu key={item.id} exercise={item} />
          );
         
        }
        if (item.type === "problemsFooter") {
          return (
           <Problems key={item.id} courseSlug={courseSlug} weekId={item.weekId} />
          );
        }
        return null;
      }}
      newItemPath="/admin/exercises/new"
      weekType="weeks"
    />
  );
}