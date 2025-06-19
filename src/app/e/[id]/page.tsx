"use client";

import { use, useEffect, useRef } from "react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import { useQuery } from "@/usingSession";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const exerciseId = resolvedParams.id as Id<"exercises">;
  const attemptId = useQuery(api.exercises.getLastAttempt, { exerciseId });

  const executed = useRef(false);
  useEffect(() => {
    if (attemptId === undefined || executed.current) {
      return;
    }

    executed.current = true;
    router.replace(
      attemptId === null
        ? `/a/new?exerciseId=${exerciseId}`
        : `/a/${attemptId}`,
    );
  });

  return null;
}
