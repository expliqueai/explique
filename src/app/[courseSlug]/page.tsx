"use client"

import { setSavedLastCourseSlug } from "@/components/SessionProvider"
import { useCourseSlug } from "@/hooks/useCourseSlug"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function Page() {
  const router = useRouter()
  const courseSlug = useCourseSlug()

  useEffect(() => {
    setSavedLastCourseSlug(courseSlug)
    router.push(`/${courseSlug}/exercises`)
  }, [router, courseSlug])

  return null
}
