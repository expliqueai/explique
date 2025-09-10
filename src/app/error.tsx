"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { ExclamationCircleIcon } from "@heroicons/react/24/outline";
import { ConvexError } from "convex/values";

export default function ErrorPage({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    // Log the error to Sentry
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="bg-red-50 h-full items-center justify-center flex p-4">
      <div className="bg-white border-t-red-500 rounded-xl shadow-xl overflow-hidden w-80">
        <div className="h-3 bg-gradient-to-b from-red-500 to-red-600"></div>
        <div className="flex gap-2 items-center p-6">
          <ExclamationCircleIcon className="h-6 w-6 text-red-500" />
          <div className="flex-1 text-gray-900">
            {error instanceof ConvexError
              ? error.data
              : "An unexpected error happened."}
          </div>
        </div>
      </div>
    </div>
  );
}
