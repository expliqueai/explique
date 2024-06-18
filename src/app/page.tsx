"use client";

import { useSessionId } from "@/components/SessionProvider";
import { useConvex } from "convex/react";
import type { NextPage } from "next";
import { useEffect, useRef } from "react";
import { api } from "../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const RootPage: NextPage = () => {
  const convex = useConvex();
  const sessionId = useSessionId();
  const router = useRouter();

  const executed = useRef(false);

  useEffect(() => {
    if (executed.current) {
      return;
    }
    executed.current = true;

    (async () => {
      if (sessionId === null) {
        router.push("/login");
        return;
      }

      const result = await convex.query(api.courses.getMostRecentRegistration, {
        sessionId,
      });

      if (result.error === "not_logged_in") {
        router.push("/login");
        return;
      }

      if (result.error === "not_enrolled") {
        toast.error(
          "You are not enrolled in any courses. Please contact your instructor.",
          {
            duration: Infinity,
          },
        );
        return;
      }

      router.replace(`/${result.slug}`);
    })();
  });

  return null;
};

export default RootPage;
