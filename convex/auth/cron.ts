import { internalMutation } from "../_generated/server";
import { ConvexMutationAdapter } from "./adapters/ConvexMutationAdapter";
import { initializeLucia } from "./lucia";

export default internalMutation(async ({ db }) => {
  const lucia = initializeLucia(new ConvexMutationAdapter(db));
  await lucia.deleteExpiredSessions();
});
