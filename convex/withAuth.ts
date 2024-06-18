import { ObjectType, PropertyValidators, v } from "convex/values";
import { Session } from "lucia";
import {
  ActionCtx,
  DatabaseWriter,
  MutationCtx,
  QueryCtx,
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { Auth, getAuth } from "./auth/lucia";
import { actionAuthDbWriter, mutationAuthDbWriter } from "./authDbWriter";

export function queryWithAuth<
  ArgsValidator extends PropertyValidators,
  Output,
>({
  args,
  handler,
}: {
  args: ArgsValidator;
  handler: (
    ctx: Omit<QueryCtx, "auth"> & { session: Session | null },
    args: ObjectType<ArgsValidator>,
  ) => Output;
}) {
  return query({
    args: {
      ...args,
      sessionId: v.union(v.null(), v.string()),
    },
    handler: async (ctx, args: any) => {
      const session = await getValidExistingSession(ctx, args.sessionId);
      return handler({ ...ctx, session }, args);
    },
  });
}

export function internalQueryWithAuth<
  ArgsValidator extends PropertyValidators,
  Output,
>({
  args,
  handler,
}: {
  args: ArgsValidator;
  handler: (
    ctx: Omit<QueryCtx, "auth"> & { session: Session | null },
    args: ObjectType<ArgsValidator>,
  ) => Output;
}) {
  return internalQuery({
    args: { ...args, sessionId: v.union(v.null(), v.string()) },
    handler: async (ctx, args: any) => {
      const session = await getValidExistingSession(ctx, args.sessionId);
      return handler({ ...ctx, session }, args);
    },
  });
}

export function mutationWithAuth<
  ArgsValidator extends PropertyValidators,
  Output,
>({
  args,
  handler,
}: {
  args: ArgsValidator;
  handler: (
    ctx: Omit<MutationCtx, "auth"> & { auth: Auth; session: Session | null },
    args: ObjectType<ArgsValidator>,
  ) => Output;
}) {
  return mutation({
    args: { ...args, sessionId: v.union(v.null(), v.string()) },
    handler: async (ctx, args: any) => {
      const auth = getAuth(mutationAuthDbWriter(ctx.db));
      const session = await getValidSessionAndRenew(auth, args.sessionId);
      return handler({ ...ctx, session, auth }, args);
    },
  });
}

export function internalMutationWithAuth<
  ArgsValidator extends PropertyValidators,
  Output,
>({
  args,
  handler,
}: {
  args: ArgsValidator;
  handler: (
    ctx: Omit<MutationCtx, "auth"> & { auth: Auth; session: Session | null },
    args: ObjectType<ArgsValidator>,
  ) => Output;
}) {
  return internalMutation({
    args: { ...args, sessionId: v.union(v.null(), v.string()) },
    handler: async (ctx, args: any) => {
      const auth = getAuth(mutationAuthDbWriter(ctx.db));
      const session = await getValidSessionAndRenew(auth, args.sessionId);
      return handler({ ...ctx, session, auth }, args);
    },
  });
}

export function actionWithAuth<
  ArgsValidator extends PropertyValidators,
  Output,
>({
  args,
  handler,
}: {
  args: ArgsValidator;
  handler: (
    ctx: Omit<ActionCtx, "auth"> & { session: Session | null },
    args: ObjectType<ArgsValidator>,
  ) => Output;
}) {
  return action({
    args: {
      ...args,
      sessionId: v.union(v.null(), v.string()),
    },
    handler: async (ctx, args: any) => {
      const auth = getAuth(actionAuthDbWriter(ctx));
      const session = await getValidSessionAndRenew(auth, args.sessionId);
      return handler({ ...ctx, session }, args);
    },
  });
}

async function getValidExistingSession(
  ctx: QueryCtx,
  sessionId: string | null,
) {
  if (sessionId === null) {
    return null;
  }
  // The cast is OK because we will only expose the existing session
  const auth = getAuth(mutationAuthDbWriter(ctx.db as DatabaseWriter));
  try {
    const session = (await auth.getSession(sessionId)) as Session | null;
    if (session === null || session.state === "idle") {
      return null;
    }
    return session;
  } catch (error) {
    // Invalid session ID
    return null;
  }
}

async function getValidSessionAndRenew(auth: Auth, sessionId: string | null) {
  if (sessionId === null) {
    return null;
  }
  try {
    return await auth.validateSession(sessionId);
  } catch (error) {
    // Invalid session ID
    return null;
  }
}
