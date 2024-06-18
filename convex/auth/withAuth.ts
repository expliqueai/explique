import { ObjectType, PropertyValidators, v } from "convex/values";
import { Adapter, User } from "lucia";
import {
  ActionCtx,
  DatabaseWriter,
  MutationCtx,
  QueryCtx,
  action,
  mutation,
  query,
} from "../_generated/server";
import { initializeLucia } from "./lucia";
import { ConvexMutationAdapter } from "./adapters/ConvexMutationAdapter";
import { ConvexActionAdapter } from "./adapters/ConvexActionAdapter";

export type Session = {
  user: User;
};

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
      // The cast is OK because we will only expose the existing session
      const adapter = new ConvexMutationAdapter(ctx.db as DatabaseWriter);
      const session = await getValidExistingSession(adapter, args.sessionId);
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
    ctx: Omit<MutationCtx, "auth"> & { session: Session | null },
    args: ObjectType<ArgsValidator>,
  ) => Output;
}) {
  return mutation({
    args: { ...args, sessionId: v.union(v.null(), v.string()) },
    handler: async (ctx, args: any) => {
      // The cast is OK because we will only expose the existing session
      const adapter = new ConvexMutationAdapter(ctx.db as DatabaseWriter);
      const session = await getValidExistingSession(adapter, args.sessionId);
      return handler({ ...ctx, session }, args);
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
      const adapter = new ConvexActionAdapter(ctx);
      const session = await getValidExistingSession(adapter, args.sessionId);
      return handler({ ...ctx, session }, args);
    },
  });
}

async function getValidExistingSession(
  adapter: Adapter,
  sessionId: string | null,
) {
  if (sessionId === null) {
    return null;
  }

  const lucia = initializeLucia(adapter);
  try {
    const { user } = await lucia.validateSession(sessionId);
    if (user === null) return null;
    return { user };
  } catch (error) {
    return null;
  }
}
