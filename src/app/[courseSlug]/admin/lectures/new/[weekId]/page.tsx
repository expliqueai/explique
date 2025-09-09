"use client"

import LectureForm, { toConvexState } from "@/components/LectureForm"
import Title from "@/components/typography"
import { useCourseSlug } from "@/hooks/useCourseSlug"
import { useAction } from "@/usingSession"
import { useParams, useRouter } from "next/navigation"
import ReactPlayer from "react-player"
import { toast } from "sonner"
import { api } from "../../../../../../../convex/_generated/api"
import { Id } from "../../../../../../../convex/_generated/dataModel"

export default function NewLecture() {
  const router = useRouter()
  const params = useParams()
  const initialWeekId = params.weekId as Id<"lectureWeeks">
  const courseSlug = useCourseSlug()
  const create = useAction(api.admin.lectures.create)

  return (
    <div className="flex h-full justify-center bg-slate-100 p-10">
      <div className="max-w-6xl flex-1">
        <Title backHref={`/${courseSlug}/admin/lectures`}>New Lecture</Title>
        <LectureForm
          type="create"
          initialState={{
            weekId: initialWeekId,
            name: "",
            image: undefined,
            url: "",
            firstMessage:
              "Hi there! 👋 I'm Questionable Prof, your AI assistant for this lecture video. Feel free to ask me any questions you have about the material. Let's learn together!",
          }}
          onSubmit={async (state) => {
            if (!ReactPlayer.canPlay(state.url)) {
              toast.error("Invalid video URL.")
              return
            }

            await create({
              courseSlug,
              lecture: {
                ...toConvexState(state),
                status: "NOT_STARTED",
              },
            })

            toast.success("Lecture created successfully.")
            toast.info("The video processing will start soon.")

            router.push(`/${courseSlug}/admin/lectures`)
          }}
        />
      </div>
    </div>
  )
}
