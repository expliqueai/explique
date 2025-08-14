import {
  ReactMutation,
  useAction as useConvexAction,
  useMutation as useConvexMutation,
  useQuery as useConvexQuery,
} from "convex/react"
import { FunctionReference } from "convex/server"
import { ConvexError } from "convex/values"
import { useCallback } from "react"
import { toast } from "sonner"
import { useSessionId } from "./components/SessionProvider"

export function useQuery<
  Args extends { sessionId: string | null },
  Query extends FunctionReference<"query", "public", Args>,
>(
  query: Query,
  args: Omit<Query["_args"], "sessionId"> | "skip"
): Query["_returnType"] | undefined {
  const sessionId = useSessionId()
  return useConvexQuery(
    query,
    args === "skip"
      ? "skip"
      : ({ ...args, sessionId } as Parameters<typeof useConvexQuery>[1])
  )
}

export function useMutation<
  Args extends { sessionId: string | null },
  Mutation extends FunctionReference<"mutation", "public", Args>,
>(
  mutation: Mutation
): ReactMutation<
  FunctionReference<"mutation", "public", Omit<Mutation["_args"], "sessionId">>
> {
  const doMutation = useConvexMutation(mutation)
  const sessionId = useSessionId()
  // @ts-expect-error Complex Convex type inference for optimistic updates
  return useCallback(
    async (args: Omit<Mutation["_args"], "sessionId">) => {
      try {
        // @ts-expect-error Convex type system doesn't handle sessionId injection well
        return await doMutation({ ...args, sessionId })
      } catch (error) {
        const errorMessage =
          error instanceof ConvexError
            ? error.data
            : "An unexpected error occurred."
        toast.error(errorMessage)
        throw error
      }
    },
    [doMutation, sessionId]
  )
}

export function useAction<
  Args extends { sessionId: string | null },
  Action extends FunctionReference<"action", "public", Args>,
>(
  action: Action
): ReactMutation<
  FunctionReference<"mutation", "public", Omit<Action["_args"], "sessionId">>
> {
  const doAction = useConvexAction(action)
  const sessionId = useSessionId()
  // @ts-expect-error Complex Convex type inference for optimistic updates
  return useCallback(
    async (args: Omit<Action["_args"], "sessionId">) => {
      try {
        // @ts-expect-error Convex type system doesn't handle sessionId injection well
        return await doAction({ ...args, sessionId })
      } catch (error) {
        const errorMessage =
          error instanceof ConvexError
            ? error.data
            : "An unexpected error occurred."
        toast.error(errorMessage)
        throw error
      }
    },
    [doAction, sessionId]
  )
}
