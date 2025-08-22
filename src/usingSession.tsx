/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  useQuery as useConvexQuery,
  useMutation as useConvexMutation,
  useAction as useConvexAction,
  ReactMutation,
} from "convex/react";
import { FunctionReference } from "convex/server";
import { useCallback } from "react";
import { useSessionId } from "./components/SessionProvider";
import { toast } from "sonner";
import { ConvexError } from "convex/values";

export function useQuery<
  Args extends { sessionId: string | null },
  Query extends FunctionReference<"query", "public", Args>,
>(
  query: Query,
  args: Omit<Query["_args"], "sessionId"> | "skip",
): Query["_returnType"] | undefined {
  const sessionId = useSessionId();
  return useConvexQuery(
    query,
    args === "skip" ? "skip" : ({ ...args, sessionId } as any),
  ) as any;
}

export function useMutation<
  Args extends { sessionId: string | null },
  Mutation extends FunctionReference<"mutation", "public", Args>,
>(
  mutation: Mutation,
): ReactMutation<
  FunctionReference<"mutation", "public", Omit<Mutation["_args"], "sessionId">>
> {
  const doMutation = useConvexMutation(mutation);
  const sessionId = useSessionId();
  return useCallback(
    async (args: Omit<Mutation["_args"], "sessionId">) => {
      try {
        return await doMutation({ ...args, sessionId } as any);
      } catch (error) {
        const errorMessage =
          error instanceof ConvexError
            ? error.data
            : "An unexpected error occurred.";
        toast.error(errorMessage);
        throw error;
      }
    },
    [doMutation, sessionId],
  ) as any
}

export function useAction<
  Args extends { sessionId: string | null },
  Action extends FunctionReference<"action", "public", Args>,
>(
  action: Action,
): ReactMutation<
  FunctionReference<"mutation", "public", Omit<Action["_args"], "sessionId">>
> {
  const doAction = useConvexAction(action);
  const sessionId = useSessionId();
  return useCallback(
    async (args: Omit<Action["_args"], "sessionId">) => {
      try {
        return await doAction({ ...args, sessionId } as any);
      } catch (error) {
        const errorMessage =
          error instanceof ConvexError
            ? error.data
            : "An unexpected error occurred.";
        toast.error(errorMessage);
        throw error;
      }
    },
    [doAction, sessionId],
  ) as any
}
