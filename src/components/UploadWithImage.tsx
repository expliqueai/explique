import { ArrowUpTrayIcon, XMarkIcon } from "@heroicons/react/24/outline"
import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"

export default function UploadWithImage({
  value,
  onChange,
}: {
  value: File | null
  onChange: (file: File | null) => void
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  const [fileUrl, setFileUrl] = useState("")

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles.length > 0 ? acceptedFiles[0] : null
      if (file !== null) {
        setFileUrl(URL.createObjectURL(file))
      } else {
        setFileUrl("")
      }
      onChange(file)
    },
    [onChange]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".gif", ".webp"],
      "application/pdf": [".pdf"],
    },
  })

  const handleRemove = () => {
    setFileUrl("")
    onChange(null)
  }

  return (
    <div className="mt-10 mb-6 flex flex-col items-center justify-items-center">
      {!value ? (
        <div
          {...getRootProps()}
          className={`bg-blue-10 h-40 w-80 max-w-md cursor-pointer content-center items-center rounded border-2 border-dashed border-blue-900 text-blue-900 transition-colors hover:bg-blue-50 ${
            isDragActive ? "border-blue-700 bg-blue-100" : ""
          }`}
        >
          <input {...getInputProps()} />
          <div className="flex h-full w-full items-center justify-center rounded">
            <ArrowUpTrayIcon className="h-10 w-10" />
          </div>
        </div>
      ) : (
        <picture className="relative inline-flex">
          <img className="max-h-40 max-w-80 p-2" src={fileUrl} alt={""} />
          <button
            className="absolute top-0 right-0 z-1 rounded-full bg-red-700 text-white"
            onClick={handleRemove}
            type="button"
          >
            <XMarkIcon className="h-5 w-5 p-1" />
          </button>
        </picture>
      )}
    </div>
  )
}
