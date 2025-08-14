"use client"

import { LectureLinkWithMenu } from "@/components/admin/LectureLinkWithMenu"
import { WeekList } from "@/components/admin/WeekList"
import { useCourseSlug } from "@/hooks/useCourseSlug"
import { useMutation, useQuery } from "@/usingSession"
import { toast } from "sonner"
import { api } from "../../../../../../convex/_generated/api"
import { Id } from "../../../../../../convex/_generated/dataModel"

export default function AdminLecturesPage() {
  const courseSlug = useCourseSlug()
  const weeks = useQuery(api.admin.lectures.list, { courseSlug })
  const deleteWeek = useMutation(api.admin.lectureWeeks.remove)

  return (
    <WeekList
      title="Lectures"
      weeks={weeks?.map((week) => ({ ...week, items: week.lectures }))}
      onDeleteWeek={async (weekId) => {
        await deleteWeek({ id: weekId as Id<"lectureWeeks">, courseSlug })
        toast.success("Week deleted successfully")
      }}
      renderItem={(lecture) => (
        <LectureLinkWithMenu key={lecture.id} lecture={lecture} />
      )}
      newItemPath="/admin/lectures/new"
      weekType="lectureWeeks"
    />
  )
}
