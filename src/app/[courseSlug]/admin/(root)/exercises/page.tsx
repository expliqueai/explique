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
      weeks={weeks}
      onDeleteWeek={async (weekId) => {
        await deleteWeek({ id: weekId, courseSlug });
        toast.success("Week deleted successfully");
      }}
      renderItem={(item: any) => {
        if (item.type === "exercise") {
          return <ExerciseLinkWithMenu key={item.id} exercise={item} />;
        }
        if (item.type === "problemSet") {
          return (
            <div key={item.id} className="col-span-full">
            <div className="flex-1 mt-3">
              <ExtractedProblemsList
                courseSlug={courseSlug}
                weekId={item.weekId}
              />
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