"use client"

import { useAction } from "@/usingSession"
import { useRouter } from "next/navigation"
import { useEffect, useRef } from "react"
import { api } from "../../../../convex/_generated/api"
import { Id } from "../../../../convex/_generated/dataModel"

export default function Page() {
  const router = useRouter()
  const startAttempt = useAction(api.attempts.start)

  const executed = useRef(false)
  useEffect(() => {
    const exerciseIdStr =
      new URLSearchParams(window.location.search).get("exerciseId") ?? null
    if (executed.current || !exerciseIdStr) {
      return
    }
    executed.current = true
    ;(async () => {
      const newAttemptId = await startAttempt({
        exerciseId: exerciseIdStr as Id<"exercises">,
      })
      router.replace(`/a/${newAttemptId}`)
    })()
  })

  return null
}
