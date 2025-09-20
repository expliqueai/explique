"use client";

import { useMutation, useQuery } from "@/usingSession";
import { api } from "../../../../../../convex/_generated/api";
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
    weeksRaw?.map((week: any) => {
      const exercises = (week.items ?? []).filter((it: any) => it.type === "exercise");
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
      renderItem={(item: any) => {
        if (item.type === "exercise") {
          return <ExerciseLinkWithMenu key={item.id} exercise={item} />;
        }
        if (item.type === "problemsFooter") {
          return (
            <div key={item.id} className="col-span-full">
              <div className="mt-3">
                <Problems courseSlug={courseSlug} weekId={item.weekId} />
              </div>
            </div>
          );
        }
        return null;
      }}
      newItemPath="/admin/exercises/new"
      weekType="weeks"
    />
  );
}