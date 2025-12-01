import { ArrowUpTrayIcon } from "@heroicons/react/24/outline"
import { useCallback } from "react"
import { useDropzone } from "react-dropzone"

export default function Upload({
  value,
  onChange,
}: {
  value: File | null
  onChange: (file: File | null) => void
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles.length > 0 ? acceptedFiles[0] : null
      onChange(file)
    },
    [onChange]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
  })

  return (
    <div className="mt-10 mb-6 flex flex-col items-center justify-center">
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
      {value && (
        <div className="mt-2">
          <p className="text-sm font-medium text-blue-900">{value.name}</p>
        </div>
      )}
    </div>
  )
}