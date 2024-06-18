import { ConvexError, v } from "convex/values";
import { DatabaseWriter, mutation } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { generateIdFromEntropySize } from "lucia";
import { initializeLucia } from "./lucia";
import { ConvexMutationAdapter } from "./adapters/ConvexMutationAdapter";
import * as jsrsasign from "jsrsasign";

function validateToken(jwt: string): string | false {
  const jwtKey = process.env.JWT_PUBLIC_KEY;
  if (!jwtKey) {
    console.error("Configuration issue: JWT_PUBLIC_KEY is not set");
    return false;
  }

  const verify = jsrsasign.KJUR.jws.JWS.verifyJWT(jwt, jwtKey, {
    alg: ["RS256"],
    iss: ["https://cs250.epfl.ch"],
    gracePeriod: 10 * 60, // 10 minutes
  });
  if (!verify) {
    return false;
  }

  const jwtPayload = jsrsasign.KJUR.jws.JWS.readSafeJSONString(
    jsrsasign.b64utoutf8(jwt.split(".")[1]),
  );
  if (!jwtPayload) {
    console.error("Invalid JWT: can’t read the payload");
    return false;
  }

  const sub =
    "sub" in jwtPayload && typeof jwtPayload.sub === "string"
      ? jwtPayload.sub
      : null;
  if (!sub) {
    console.error("Invalid JWT: can’t read the subject");
    return false;
  }

  return sub;
}

async function getOrCreateUser(
  db: DatabaseWriter,
  identifier: string,
): Promise<{ luciaUserId: string }> {
  const existingUser = await db
    .query("users")
    .withIndex("byIdentifier", (q) => q.eq("identifier", identifier))
    .first();

  if (existingUser) return { luciaUserId: existingUser.id };

  const luciaUserId = generateIdFromEntropySize(10);
  await db.insert("users", {
    id: luciaUserId,
    identifier,
    email: null,
    name: null,
  });
  return { luciaUserId };
}

export const login = mutation({
  args: { jwt: v.string() },
  handler: async (ctx, { jwt }) => {
    const sub = validateToken(jwt);
    if (sub === false) {
      throw new ConvexError("Invalid authentication token");
    }

    const lucia = initializeLucia(new ConvexMutationAdapter(ctx.db));
    const { luciaUserId } = await getOrCreateUser(ctx.db, sub);
    const session = await lucia.createSession(luciaUserId, {
      // These will be filled out by Convex
      _id: "" as Id<"sessions">,
      _creationTime: 0,
    });

    return session.id;
  },
});
