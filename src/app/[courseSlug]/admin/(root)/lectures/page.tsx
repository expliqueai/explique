"use client";

import { useMutation, useQuery } from "@/usingSession";
import { api } from "../../../../../../convex/_generated/api";
import { useCourseSlug } from "@/hooks/useCourseSlug";
import { WeekList } from "@/components/admin/WeekList";
import { toast } from "sonner";
import { LectureLinkWithMenu } from "@/components/admin/LectureLinkWithMenu";

export default function AdminLecturesPage() {
  const courseSlug = useCourseSlug();
  const weeks = useQuery(api.admin.lectures.list, { courseSlug });
  const deleteWeek = useMutation(api.admin.lectureWeeks.remove);

  return (
    <WeekList
      title="Lectures"
      weeks={weeks?.map((week) => ({ ...week, items: week.lectures }))}
      onDeleteWeek={async (weekId) => {
        await deleteWeek({ id: weekId, courseSlug });
        toast.success("Week deleted successfully");
      }}
      renderItem={(lecture) => (
        <LectureLinkWithMenu key={lecture.id} lecture={lecture} />
      )}
      newItemPath="/admin/lectures/new"
      weekType="lectureWeeks"
    />
  );
}
