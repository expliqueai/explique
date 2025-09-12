import { useCallback } from "react"

export function useFileUpload(generateUploadUrl: () => Promise<string>) {
  const startUpload = useCallback(
    async (files: File[]) => {
      const results = []

      for (const file of files) {
        const uploadUrl = await generateUploadUrl()

        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        })

        const result = await response.json()
        results.push({
          response: result,
        })
      }

      return results
    },
    [generateUploadUrl]
  )

  return { startUpload }
}