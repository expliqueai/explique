import { Modal } from "@/components/Modal"
import { HandThumbDownIcon } from "@heroicons/react/24/outline"
import clsx from "clsx"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "./Button"
import Input from "./Input"

export type ReportMessageProps = {
  isReported: boolean
  onReport: (reason: string) => Promise<void>
  onUnreport: () => Promise<void>
}

export default function ReportMessage({
  isReported,
  onReport,
  onUnreport,
}: ReportMessageProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [reason, setReason] = useState("")

  return (
    <>
      <div className="box-content flex items-center justify-end p-1">
        <button
          className={clsx(
            "absolute -right-10 bottom-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full shadow-md",
            isReported && "bg-purple-600 text-white hover:bg-purple-700",
            !isReported && "bg-white text-purple-600 hover:bg-neutral-50"
          )}
          type="button"
          title="Report"
          onClick={async (e) => {
            e.preventDefault()
            if (isReported) {
              await onUnreport()
              toast.success("Your message report has been removed.")
            } else {
              setIsModalOpen(true)
            }
          }}
        >
          <HandThumbDownIcon className="h-5 w-5" />
        </button>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Why are you reporting this message?"
      >
        <form
          className="mt-5"
          onSubmit={async (e) => {
            e.preventDefault()
            if (reason.trim()) {
              setIsModalOpen(false)
              setReason("")
              await onReport(reason)
              toast.success("The message has been reported. Thank you!")
            }
          }}
        >
          <Input
            label=""
            placeholder="Report reason"
            value={reason}
            onChange={(value) => setReason(value)}
            required
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              onClick={() => {
                setIsModalOpen(false)
                setReason("")
              }}
              variant="secondary"
              size="sm"
            >
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Report Message
            </Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
