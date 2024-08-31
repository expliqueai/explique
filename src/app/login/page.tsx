"use client";

import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useEffect, useRef } from "react";
import * as Sentry from "@sentry/nextjs";
import { toast } from "sonner";
import { useIsUsingIdentities } from "@/hooks/useIdentities";

async function getTequilaLoginUrl() {
  const response = await fetch("/api/tequila");
  const data = await response.json();

  if (!data.ok) {
    throw new Error("Unable to log in");
  }

  return data.redirect;
}

export default function Page() {
  const generateGoogleAuthUrl = useAction(api.auth.google.getLoginUrl);

  const isUsingIdentities = useIsUsingIdentities();

  const executed = useRef(false);
  useEffect(() => {
    if (executed.current) {
      return;
    }
    executed.current = true;

    (async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const external = urlParams.has("external") ? true : undefined;
      const legacy = urlParams.has("legacy") || !isUsingIdentities;

      if (external || legacy) {
        const { url, state, codeVerifier } = await generateGoogleAuthUrl({
          external,
        });

        localStorage.setItem("googleState", state);
        localStorage.setItem("googleCodeVerifier", codeVerifier);
        localStorage.setItem("googleExternal", external ? "true" : "false");

        window.location.href = url;
      } else {
        try {
          window.location.href = await getTequilaLoginUrl();
        } catch (e) {
          console.error("Login error", e);
          toast.error(
            "An error occurred while trying to log in. Please try again.",
          );
          Sentry.captureException(e);
        }
      }
    })();
  });

  return null;
}
