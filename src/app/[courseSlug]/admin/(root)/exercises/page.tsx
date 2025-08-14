"use client"

import { ExerciseLinkWithMenu } from "@/components/admin/ExerciseLinkWithMenu"
import { WeekList } from "@/components/admin/WeekList"
import { useCourseSlug } from "@/hooks/useCourseSlug"
import { useMutation, useQuery } from "@/usingSession"
import { toast } from "sonner"
import { api } from "../../../../../../convex/_generated/api"
import { Id } from "../../../../../../convex/_generated/dataModel"

export default function AdminExercisesPage() {
  const courseSlug = useCourseSlug()
  const weeks = useQuery(api.admin.exercises.list, { courseSlug })
  const deleteWeek = useMutation(api.admin.weeks.remove)

  return (
    <WeekList
      title="Exercises"
      weeks={weeks?.map((week) => ({ ...week, items: week.exercises }))}
      onDeleteWeek={async (weekId) => {
        await deleteWeek({ id: weekId as Id<"weeks">, courseSlug })
        toast.success("Week deleted successfully")
      }}
      renderItem={(exercise) => (
        <ExerciseLinkWithMenu key={exercise.id} exercise={exercise} />
      )}
      newItemPath="/admin/exercises/new"
      weekType="weeks"
    />
  )
}
