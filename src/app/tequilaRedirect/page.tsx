"use client";

import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useEffect, useRef, useState } from "react";
import { useSetSession } from "@/components/SessionProvider";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PrimaryButton } from "@/components/PrimaryButton";

function LoginError({ retryLink }: { retryLink: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <p className="text-xl font-light mb-8">
        An error occurred while logging in.
      </p>

      <PrimaryButton href={retryLink}>Retry</PrimaryButton>
    </div>
  );
}

async function login(key: string, authCheck: string) {
  const res = await fetch(`/api/tequila?key=${key}&auth_check=${authCheck}`);
  const value = await res.json();

  if (!value.ok) {
    throw new Error("Invalid response");
  }

  const jwt = value.jwt as string;
  const identity = value.identity as {
    name: string;
    email: string;
  };

  return { jwt, identity };
}

export default function Page() {
  const tequilaLogin = useMutation(api.auth.tequila.login);
  const setSession = useSetSession();
  const router = useRouter();
  const [showError, setShowError] = useState(false);

  const executed = useRef(false);
  useEffect(() => {
    const key = new URLSearchParams(window.location.search).get("key") ?? null;
    const authCheck =
      new URLSearchParams(window.location.search).get("auth_check") ?? null;

    if (executed.current || !key || !authCheck || !router) {
      return;
    }
    executed.current = true;

    (async () => {
      let result;
      try {
        result = await login(key, authCheck);
      } catch (e) {
        console.error(e);
        setShowError(true);
        return;
      }

      const { identity, jwt } = result;
      const newSessionId = await tequilaLogin({ jwt });
      setSession(newSessionId, identity);

      router.replace("/");
    })();
  });

  return showError && <LoginError retryLink="/login" />;
}
