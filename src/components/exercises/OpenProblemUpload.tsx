"use client"

import { useAction, useMutation, useQuery } from "@/usingSession"
import { ArrowUpTrayIcon } from "@heroicons/react/24/outline"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import Markdown from "../Markdown"

export default function OpenProblemUpload({
  attemptId,
  problemStatement,
}: {
  attemptId: Id<"attempts">
  problemStatement: string
}) {
  const [uploading, setUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const submission = useQuery(api.openProblem.getSubmission, { attemptId })
  const generateUploadUrl = useMutation(api.openProblem.generateUploadUrl)
  const saveAndValidate = useAction(api.openProblem.saveAndValidate)

  const handleFiles = async (rawFiles: File[]) => {
    const files = rawFiles.slice(0, 3)
    if (rawFiles.length > 3) {
      toast.error("Maximum 3 images allowed")
    }
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`File "${file.name}" too large (max 10 MB each)`)
        return
      }
      if (!file.type.startsWith("image/")) {
        toast.error(`File "${file.name}" is not an image`)
        return
      }
    }

    try {
      setUploading(true)
      const storageIds: Id<"_storage">[] = []

      for (const file of files) {
        const uploadUrl = await generateUploadUrl({ attemptId })
        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        })
        if (!response.ok) throw new Error("Upload failed")
        const { storageId } = await response.json()
        storageIds.push(storageId)
      }

      await saveAndValidate({ attemptId, storageIds })
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Upload failed, please try again"
      )
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const isValidating = submission?.validationStatus === "validating"
  const isRejected = submission?.validationStatus === "rejected"

  useEffect(() => {
    if (isRejected && submission?.rejectionReason) {
      toast.error(submission.rejectionReason)
    }
  }, [isRejected, submission?.rejectionReason])

  return (
    <div className="flex flex-col gap-6">
      {/* Problem Statement */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-6">
        <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-500">
          Problem
        </h3>
        <div className="prose prose-sm max-w-none">
          <Markdown text={problemStatement} />
        </div>
      </div>

      {/* Validating spinner */}
      {isValidating && (
        <div className="flex items-center justify-center gap-3 py-8">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-purple-600" />
          <span className="text-sm text-slate-600">
            Validating your submission...
          </span>
        </div>
      )}

      {/* Upload zone */}
      {!isValidating && (
        <div
          className={`cursor-pointer rounded-lg border-2 border-dashed p-12 text-center transition-colors ${
            isDragging
              ? "border-purple-500 bg-purple-50"
              : uploading
                ? "pointer-events-none border-slate-300 opacity-50"
                : "border-slate-300 hover:border-purple-400 hover:bg-purple-50/50"
          }`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setIsDragging(false)
            const files = Array.from(e.dataTransfer.files).filter((f) =>
              f.type.startsWith("image/")
            )
            if (files.length > 0) handleFiles(files)
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = e.target.files
              if (files && files.length > 0) handleFiles(Array.from(files))
            }}
          />

          <ArrowUpTrayIcon className="mx-auto h-12 w-12 text-slate-400" />

          {uploading ? (
            <p className="mt-4 text-lg font-medium text-slate-600">
              Uploading...
            </p>
          ) : (
            <>
              <p className="mt-4 text-lg font-medium text-slate-700">
                {isRejected
                  ? "Upload new images"
                  : "Upload your handwritten solution"}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Take photos of your handwritten work or upload iPad screenshots.
                You can select up to 3 files.
              </p>
              <p className="mt-2 text-xs text-slate-400">
                Images only, max 10 MB each
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
