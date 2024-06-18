"use client";

import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useEffect, useRef } from "react";
import { useSetSession } from "@/components/SessionProvider";
import { toast } from "sonner";

export default function Page() {
  const authMutation = useAction(api.auth.google.redirect);
  const setSession = useSetSession();

  const executed = useRef(false);
  useEffect(() => {
    if (executed.current) {
      return;
    }
    executed.current = true;

    const storedState = localStorage.getItem("googleState");
    const storedCodeVerifier = localStorage.getItem("googleCodeVerifier");

    const code =
      new URLSearchParams(window.location.search).get("code") ?? null;
    const state =
      new URLSearchParams(window.location.search).get("state") ?? null;
    if (!code || !state || !storedState || !storedCodeVerifier) {
      toast.error("Invalid login request", { duration: Infinity });
      return;
    }

    (async () => {
      const newSessionId = await authMutation({
        code,
        state,
        storedState,
        storedCodeVerifier,
      });
      const identity = null; // Provided by Convex in this case
      setSession(newSessionId, identity);
      window.location.href = "/";
    })();
  });

  return null;
}
