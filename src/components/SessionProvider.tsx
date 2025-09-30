import { createContext, useCallback, useContext, useState } from "react"

const SessionContext = createContext(
  null as {
    sessionId: string | null
    identity: Identity | null
    setSession: (sessionId: string | null, identity: Identity | null) => void
  } | null
)

export function useSessionId(): string | null {
  const context = useContext(SessionContext)
  if (context === null) throw new Error("No session context found.")

  return context.sessionId
}

export function useIdentity(): Identity | null {
  const context = useContext(SessionContext)
  if (context === null) throw new Error("No session context found.")

  return context.identity
}

export function useSetSession() {
  const context = useContext(SessionContext)
  if (context === null) throw new Error("No session context found.")

  return context.setSession
}

type Identity = {
  name: string
  email: string
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [sessionId, setSessionId] = useState(getSavedSessionId())
  const [identity, setIdentity] = useState(getSavedIdentity())

  const setSession = useCallback(
    (sessionId: string | null, identity: Identity | null) => {
      setSavedSessionId(sessionId)
      setSessionId(sessionId)

      setSavedIdentity(identity)
      setIdentity(identity)
    },
    [setSessionId, setIdentity]
  )

  return (
    <SessionContext.Provider value={{ sessionId, identity, setSession }}>
      {children}
    </SessionContext.Provider>
  )
}

function getSavedSessionId() {
  if (typeof localStorage === "undefined") return null
  return localStorage.getItem("sessionId")
}

export function setSavedSessionId(sessionId: string | null) {
  if (sessionId == null) {
    localStorage.removeItem("sessionId")
  } else {
    localStorage.setItem("sessionId", sessionId)
  }
}

function getSavedIdentity() {
  if (typeof localStorage === "undefined") return null
  const json = localStorage.getItem("identity")
  return json
    ? (JSON.parse(json) as {
        name: string
        email: string
      })
    : null
}

export function setSavedIdentity(
  identity: {
    name: string
    email: string
  } | null
) {
  if (identity == null) {
    localStorage.removeItem("identity")
  } else {
    localStorage.setItem("identity", JSON.stringify(identity))
  }
}

function getSavedLastCourseSlugInternal() {
  if (typeof localStorage === "undefined") return null
  return localStorage.getItem("lastCourseSlug")
}

export function setSavedLastCourseSlug(courseSlug: string | null) {
  if (courseSlug == null) {
    localStorage.removeItem("lastCourseSlug")
  } else {
    localStorage.setItem("lastCourseSlug", courseSlug)
  }
}

export function getSavedLastCourseSlug() {
  return getSavedLastCourseSlugInternal()
}
