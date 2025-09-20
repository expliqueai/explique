"use client";

import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useEffect, useRef } from "react";

export default function Page() {
  const generateGoogleAuthUrl = useAction(api.auth.google.getLoginUrl);

  const executed = useRef(false);
  useEffect(() => {
    if (executed.current) {
      return;
    }

    executed.current = true;
    (async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const external = urlParams.has("external") ? true : undefined;
      const { url, state, codeVerifier } = await generateGoogleAuthUrl({
        external,
      });

      localStorage.setItem("googleState", state);
      localStorage.setItem("googleCodeVerifier", codeVerifier);
      localStorage.setItem("googleExternal", external ? "true" : "false");

      window.location.href = url;
    })();
  });

  return null;
}
