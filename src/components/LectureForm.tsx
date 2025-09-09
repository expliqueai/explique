import Input, { Select, Textarea } from "@/components/Input"
import { useCourseSlug } from "@/hooks/useCourseSlug"
import { useAction, useQuery } from "@/usingSession"
import { PlusIcon as PlusIconLarge } from "@heroicons/react/24/outline"
import clsx from "clsx"
import React, { useMemo, useState } from "react"
import { toast } from "sonner"
import { api as convexApi } from "../../convex/_generated/api"
import { Id } from "../../convex/_generated/dataModel"
import { Button } from "./Button"
import { PrimaryButton } from "./PrimaryButton"

const MEDIASPACE_REGEX =
  /^https:\/\/mediaspace\.epfl\.ch\/media\/.*\/(0_[a-zA-Z0-9]+)$/

export type State = {
  weekId: Id<"lectureWeeks">
  name: string
  image?: Id<"images">
  url: string
  firstMessage?: string
}

export function toConvexState(state: State) {
  return {
    name: state.name,
    image: state.image,
    weekId: state.weekId,
    url: state.url,
    firstMessage: state.firstMessage,
  }
}

export default function LectureForm({
  lectureId,
  initialState,
  onSubmit,
  type,
}: {
  lectureId?: Id<"lectures">
  initialState: State
  onSubmit: (state: State) => void
  type: "create" | "update"
}) {
  const [name, setName] = useState(initialState.name)
  const [weekId, setWeekId] = useState(initialState.weekId)
  const [image, setImage] = useState(initialState.image)
  const [url, setUrl] = useState(initialState.url)
  const [firstMessage, setFirstMessage] = useState(
    initialState.firstMessage ?? ""
  )
  const [isReprocessing, setIsReprocessing] = useState(false)

  const courseSlug = useCourseSlug()
  const weeks = useQuery(convexApi.admin.lectureWeeks.list, { courseSlug })
  const reprocessVideo = useAction(convexApi.admin.lectures.reprocessVideo)

  const urlValidation = useMemo(() => {
    if (!url) return { isValid: true, error: null }

    if (!url.startsWith("https://mediaspace.epfl.ch")) {
      return {
        isValid: false,
        error: "URL must start with https://mediaspace.epfl.ch",
      }
    }

    const match = url.match(MEDIASPACE_REGEX)
    if (!match) {
      return {
        isValid: false,
        error:
          "Please enter a valid EPFL MediaSpace URL ending with a video ID (0_...)",
      }
    }

    return { isValid: true, error: null }
  }, [url])

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()

        if (!urlValidation.isValid) {
          toast.error(urlValidation.error)
          return
        }

        const state = {
          name,
          image,
          weekId,
          url,
          firstMessage,
        }

        onSubmit(state)

        if (isReprocessing) {
          await reprocessVideo({
            lectureId,
            courseSlug,
          })

          toast.info("The video processing will start soon.")
        }

        // Reset reprocessing flag after submission
        setIsReprocessing(false)
      }}
    >
      <Input
        label="Name"
        value={name}
        onChange={setName}
        placeholder="Bogo Sort"
        required
      />

      {weeks && (
        <Select
          label="Week"
          value={weekId}
          onChange={(val) => setWeekId(val)}
          values={weeks.map((week) => ({ value: week.id, label: week.name }))}
        />
      )}

      <Input
        label="MediaSpace video URL"
        value={url}
        onChange={setUrl}
        required
        placeholder="https://mediaspace.epfl.ch/media/My+Super+Awesome+Lecture+Video/0_Expl1qu34I"
      />

      {lectureId && (
        <ThumbnailPicker
          image={image}
          setImage={setImage}
          lectureId={lectureId}
          name={name}
        />
      )}

      <Textarea
        label="First message"
        value={firstMessage}
        onChange={setFirstMessage}
        hint={
          <>
            This message will be sent automatically{" "}
            <strong>by the chatbot</strong> when accessing the lecture. This
            message will be visible to students.
          </>
        }
      />

      <div className="h-36"></div>

      <div className="fixed bottom-0 left-0 flex w-full justify-end gap-4 bg-white/60 p-8 shadow-2xl backdrop-blur-xl">
        {
          // TODO: Properly handle media sources
          /* {type === "update" && (
          <Button
            type="submit"
            variant="danger"
            onClick={() => setIsReprocessing(true)}
          >
            Save & Reprocess video
          </Button>
        )} */
        }
        <PrimaryButton type="submit">
          {type === "create" ? "Create" : "Save"}
        </PrimaryButton>
      </div>
    </form>
  )
}

function ThumbnailPicker({
  image,
  setImage,
  lectureId,
  name,
}: {
  image: Id<"images"> | undefined
  setImage: (value: Id<"images"> | undefined) => void
  lectureId: Id<"lectures">
  name: string
}) {
  const courseSlug = useCourseSlug()
  const images = useQuery(convexApi.admin.image.list, {
    courseSlug,
    lectureId,
  })
  const generateImage = useAction(convexApi.admin.imageGeneration.default)

  return (
    <div className="mb-6">
      <div className="mb-1 block text-sm font-medium text-slate-800">
        Thumbnail
      </div>

      <div className="flex flex-wrap gap-4">
        <button
          type="button"
          className={clsx(
            "h-28 w-40 cursor-pointer rounded-xl bg-slate-200 p-2 text-xl font-light transition-colors hover:bg-slate-300",
            image === undefined && "ring-4 ring-purple-500"
          )}
          onClick={() => setImage(undefined)}
        >
          None
        </button>

        {images?.map((i) => (
          <button
            key={i._id}
            type="button"
            className={clsx(
              "h-28 w-40 cursor-pointer rounded-xl bg-slate-200 p-2 transition-colors hover:bg-slate-300",
              i._id === image && "ring-4 ring-purple-500"
            )}
            onClick={() => setImage(i._id)}
          >
            <picture>
              {i.thumbnails.map((t, tIndex) => (
                <source
                  key={tIndex}
                  srcSet={t.src}
                  type={t.type}
                  sizes={t.sizes}
                />
              ))}
              <img
                className="h-full w-full rounded-lg object-cover"
                src={
                  i.thumbnails.find((t) => t.type === "image/avif")?.src ??
                  i.src
                }
                alt={i.prompt}
                title={i.prompt}
              />
            </picture>
          </button>
        ))}

        <button
          type="button"
          className={clsx(
            "flex h-28 w-40 cursor-pointer items-center justify-center rounded-xl bg-slate-200 p-2 text-xl font-light transition-colors hover:bg-slate-300"
          )}
          onClick={async () => {
            const answer = prompt(
              "Which prompt to use to generate the image?",
              (images ?? []).find((i) => i._id === image)?.prompt ??
                `Generate a cartoon-style thumbnail for a lecture video about "${name}"`
            )
            if (!answer) {
              return
            }

            async function generate(prompt: string) {
              const imageId = await generateImage({
                prompt,
                lectureId,
                courseSlug,
              })

              setImage(imageId)
            }

            toast.promise(generate(answer), {
              loading: "Generating thumbnail…",
              success: "Thumbnail generated",
            })
          }}
        >
          <PlusIconLarge className="h-6 w-6" />
        </button>
      </div>
    </div>
  )
}
