import { useSessionId } from "@/components/SessionProvider";
import { useConvex } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "../../convex/_generated/api";
import { useCourseSlug } from "./useCourseSlug";

export function useAdminIdentity() {
  const convex = useConvex();
  const sessionId = useSessionId();
  const courseSlug = useCourseSlug();
  const [jwt, setJwt] = useState<string | undefined>(undefined);

  useEffect(() => {
    (async () => {
      const jwt = await convex.query(api.admin.identitiesJwt.default, {
        sessionId,
        courseSlug,
      });

      setJwt(jwt);
    })();
  }, [convex, sessionId, courseSlug]);

  return jwt;
}
