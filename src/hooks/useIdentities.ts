import { useSessionId } from "@/components/SessionProvider";
import { useConvex } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "../../convex/_generated/api";
import { useCourseSlug } from "./useCourseSlug";

export type Identities = Record<string, { email: string }>;

export function useIsUsingIdentities(): boolean {
  if (typeof window === "undefined") return false;
  return window.location.host === "cs250.epfl.ch";
}

/** See /docs/identifiers.md */
export function useIdentities(): Identities | undefined {
  const isUsingIdentities = useIsUsingIdentities();
  const convex = useConvex();
  const sessionId = useSessionId();
  const courseSlug = useCourseSlug();

  const [identities, setIdentities] = useState<Identities | undefined>(
    isUsingIdentities ? undefined : {},
  );
  useEffect(() => {
    if (identities || !isUsingIdentities) return;

    (async () => {
      const jwt = await convex.query(api.admin.identitiesJwt.default, {
        sessionId,
        courseSlug,
      });

      const req = await fetch("/api/admin/identities", {
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      });

      const data = await req.json();

      setIdentities(data as Identities);
    })();
  }, [identities, convex, sessionId, courseSlug, isUsingIdentities]);

  return identities;
}
