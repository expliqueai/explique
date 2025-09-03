"use client"

import { Button } from "@/components/Button"
import Input from "@/components/Input"
import { Modal } from "@/components/Modal"
import Title from "@/components/typography"
import Upload from "@/components/Upload"
import { useCourseSlug } from "@/hooks/useCourseSlug"
import { useFileUpload } from "@/hooks/useFileUpload"
import { useMutation, useQuery } from "@/usingSession"
import { formatTimestampHumanFormat } from "@/util/date"
import { Dialog, Transition } from "@headlessui/react"
import { PlusIcon } from "@heroicons/react/20/solid"
import { PencilIcon, TrashIcon } from "@heroicons/react/24/outline"
import { pdfToImg as PdfToImg } from "pdftoimg-js/browser"
import { Fragment, useState } from "react"
import BeatLoader from "react-spinners/BeatLoader"
import { toast } from "sonner"
import { api } from "../../../../../../convex/_generated/api"
import { Id } from "../../../../../../convex/_generated/dataModel"
import { useSearchParams } from "next/navigation";


export default function AdminSuperAssistantPage() {
  const courseSlug = useCourseSlug()
  const files = useQuery(api.admin.sadatabase.list, {
    courseSlug,
  })
  const deleteFile = useMutation(api.admin.sadatabase.deleteFile)

  return (
    <>
      <Title>
        <span className="flex-1">Super-Assistant Files</span>
        <UploadFile />
      </Title>

      <table className="w-full divide-y divide-slate-300 text-sm">
        <thead>
          <tr>
            <th scope="col" className="px-2 py-3 text-left align-bottom">
              Filename
            </th>
            <th scope="col" className="px-2 py-3 text-left align-bottom">
              Week
            </th>
            <th scope="col" className="px-2 py-3 text-left align-bottom">
              Creation time
            </th>
            <th scope="col" className="justify-end py-3 align-bottom"></th>
            <th scope="col" className="justify-end py-3 pr-2 align-bottom"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {files?.map((file) => (
            <tr key={file.name}>
              <td className="px-2 py-3">
                <OpenFile filename={file.name} />
              </td>
              <td className="px-2 py-3">{"Week " + file.week}</td>
              <td className="px-2 py-3">
                {formatTimestampHumanFormat(file.creationTime)}
              </td>
              <td>
                <EditWeek fileId={file.id} />
              </td>
              <td>
                <button
                  className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-red-500 hover:text-white"
                  type="button"
                  title="Delete"
                  onClick={async (e) => {
                    e.preventDefault()
                    await deleteFile({
                      courseSlug: courseSlug,
                      name: file.name,
                    })
                  }}
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

function EditWeek({ fileId }: { fileId: Id<"saDatabase"> }) {
  const changeWeek = useMutation(api.admin.sadatabase.changeWeek)
  const [isEditWeekModalOpen, setIsEditWeekModalOpen] = useState(false)
  const weekNumber = useQuery(api.admin.sadatabase.getWeek, { fileId })
  const [newWeekNumber, setNewWeekNumber] = useState(
    weekNumber === undefined || weekNumber === null ? "" : weekNumber.toString()
  )

  return (
    <>
      <div className="flex justify-end">
        <button
          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-500 hover:text-white"
          type="button"
          title="Edit week number"
          onClick={async (e) => {
            e.preventDefault()
            setIsEditWeekModalOpen(true)
          }}
        >
          <PencilIcon className="h-5 w-5" />
        </button>
      </div>

      <Modal
        isOpen={isEditWeekModalOpen}
        onClose={() => setIsEditWeekModalOpen(false)}
        title={`Edit week number`}
      >
        <div className="mt-4">
          <Input
            label="New week number:"
            placeholder="Enter new week number"
            value={newWeekNumber}
            onChange={(value) => setNewWeekNumber(value)}
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button
            onClick={() => {
              setIsEditWeekModalOpen(false)
              if (weekNumber !== undefined && weekNumber !== null) {
                setNewWeekNumber(weekNumber.toString())
              }
            }}
            variant="secondary"
            size="sm"
          >
            Cancel
          </Button>
          <Button
            onClick={async () => {
              if (isNaN(Number(newWeekNumber))) {
                toast.error("Please provide a valid number.")
              } else if (Number(newWeekNumber) !== weekNumber) {
                setIsEditWeekModalOpen(false)
                await changeWeek({
                  fileId: fileId,
                  newWeek: Number(newWeekNumber),
                })
              } else {
                setIsEditWeekModalOpen(false)
                setNewWeekNumber(weekNumber.toString())
              }
            }}
            variant="primary"
            size="sm"
          >
            Rename
          </Button>
        </div>
      </Modal>
    </>
  )
}

function UploadFile() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const uploadFile = useMutation(api.admin.sadatabase.uploadFile)
  const generateUploadUrl = useMutation(api.admin.sadatabase.generateUploadUrl)
  const { startUpload } = useFileUpload(() => generateUploadUrl({}))
  const [week, setWeek] = useState("")
  const courseSlug = useCourseSlug()
  const [file, setFile] = useState<File | null>(null)
  const get = useQuery(api.admin.sadatabase.get, {
    courseSlug: courseSlug,
    name: file?.name,
  })
  const [isLoading, setIsLoading] = useState(false)

  async function handleUploadFile() {
    const storageIds: { pageNumber: number; storageId: string }[] = []

    if (file !== null) {
      const uploaded = await startUpload([file])
      const storageId = (uploaded[0].response as { storageId: string })
        .storageId
      storageIds.push({
        pageNumber: 0,
        storageId,
      })

      const filename = file.name.split(".")[0]
      const url = URL.createObjectURL(file)
      const pages = await PdfToImg(url, {
        imgType: "jpg",
        pages: "all",
        returnType: "buffer",
      })
      URL.revokeObjectURL(url)

      for (const index of pages.keys()) {
        const pageFile = new File(
          [pages[index]],
          `${filename}_page${index}.jpg`,
          { type: "image/jpg" }
        )
        const pageUploaded = await startUpload([pageFile])
        const pageStorageId = (
          pageUploaded[0].response as { storageId: string }
        ).storageId
        storageIds.push({
          pageNumber: index + 1,
          storageId: pageStorageId,
        })
      }
    }

    return storageIds
  }

  return (
    <>
      <Button
        type="button"
        onClick={() => {
          setIsModalOpen(true)
        }}
      >
        <PlusIcon className="h-5 w-5" />
        Upload file
      </Button>

      <Transition appear show={isLoading} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-10"
          onClose={() => {
          }}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="transform overflow-hidden text-left align-middle transition-all">
                  <BeatLoader color={"#2563eb"} size={25} />
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Upload a new file to the knowledge database."
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            if (file === null) return
            if (get === true) {
              toast.error("A file with this name already exists.")
              setFile(null)
            } else {
              const weekNumber = Number(week)
              if (week === "" || Number.isNaN(weekNumber)) {
                setWeek("")
                toast.error("Please provide a valid week number.")
              } else {
                setIsModalOpen(false)
                setIsLoading(true)
                const storageIds = await handleUploadFile()
                setFile(null)
                setWeek("")
                await uploadFile({
                  courseSlug: courseSlug,
                  week: weekNumber,
                  name: file ? file.name : "",
                  storageIds: storageIds.map((item) => ({
                    pageNumber: item.pageNumber,
                    storageId: item.storageId as Id<"_storage">,
                  })),
                })
                setIsLoading(false)
              }
            }
          }}
        >
          <Upload value={file} onChange={(value) => setFile(value)} />
          <Input
            label="Specify week:"
            placeholder="Week number"
            value={week}
            required={true}
            onChange={(value) => setWeek(value)}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              onClick={() => {
                setIsModalOpen(false)
                setWeek("")
                setFile(null)
              }}
              variant="secondary"
              size="sm"
            >
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Add file
            </Button>
          </div>
        </form>
      </Modal>
    </>
  )
}

function OpenFile({ filename }: { filename: string }) {
  const courseSlug = useCourseSlug()
  const url = useQuery(api.admin.sadatabase.getUrl, {
    courseSlug: courseSlug,
    name: filename,
  })

  return (
    <>
      {url && (
        <a href={url} download className="text-blue-600 underline">
          {filename}
        </a>
      )}
    </>
  )
}
