import { ConvexError, v } from "convex/values";
import {
  DatabaseReader,
  DatabaseWriter,
  action,
  internalMutation,
} from "../_generated/server";
import {
  Google,
  OAuth2RequestError,
  generateCodeVerifier,
  generateState,
} from "arctic";
import { internal } from "../_generated/api";
import { initializeLucia } from "./lucia";
import { ConvexMutationAdapter } from "./adapters/ConvexMutationAdapter";
import { generateIdFromEntropySize } from "lucia";
import { Doc, Id } from "../_generated/dataModel";

const clientId = process.env.GOOGLE_CLIENT_ID ?? "";
const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? "";

const redirectUri =
  (process.env.BASE_URL ?? "http://localhost:3000") + "/authRedirect";

const scopes = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "openid",
];

const google = new Google(clientId, clientSecret, redirectUri);

export const getLoginUrl = action({
  args: {
    external: v.optional(v.literal(true)),
  },
  async handler(ctx, { external }) {
    const state = generateState();
    const codeVerifier = generateCodeVerifier();

    const url = await google.createAuthorizationURL(state, codeVerifier, {
      scopes,
    });

    return {
      url: url.toString(),
      state,
      codeVerifier,
    };
  },
});

type GoogleProfile = {
  sub: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  email: string;
  email_verified: boolean;
};

export const redirect = action({
  args: {
    code: v.string(),
    state: v.string(),
    storedState: v.string(),
    storedCodeVerifier: v.string(),
  },
  handler: async (ctx, { code, state, storedState, storedCodeVerifier }) => {
    if (state !== storedState) {
      throw new ConvexError("Invalid login request");
    }

    let user: GoogleProfile;
    try {
      const tokens = await google.validateAuthorizationCode(
        code,
        storedCodeVerifier,
      );
      const response = await fetch(
        "https://openidconnect.googleapis.com/v1/userinfo",
        {
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`,
          },
        },
      );
      user = await response.json();
    } catch (e) {
      if (e instanceof OAuth2RequestError) {
        const { message, description } = e;
        throw new ConvexError(message + "" + description);
      }
      throw e;
    }

    if (typeof user.email !== "string") {
      throw new ConvexError(
        "Can’t retrieve your account’s email address. Please contact support.",
      );
    }

    if (user.email_verified !== true) {
      throw new ConvexError(
        "Your account’s email address is not verified. Please verify your email address with Google and try again.",
      );
    }

    const sessionId: string = await ctx.runMutation(
      internal.auth.google.handleLogin,
      user,
    );
    return sessionId;
  },
});

async function getExistingUser(
  db: DatabaseReader,
  profile: GoogleProfile,
): Promise<Doc<"users"> | null> {
  const existingGoogleUser = await db
    .query("users")
    .withIndex("by_google_id", (q) => q.eq("googleId", profile.sub))
    .first();
  if (existingGoogleUser) return existingGoogleUser;

  const existingEmailUser = await db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", profile.email))
    .first();
  if (existingEmailUser) return existingEmailUser;

  return null;
}

async function getOrCreateUser(
  db: DatabaseWriter,
  profile: GoogleProfile,
): Promise<{ luciaUserId: string }> {
  const existingUser = await getExistingUser(db, profile);
  if (existingUser) {
    // Update the Google metadata fields of the existing user
    await db.patch(existingUser._id, {
      googleId: profile.sub,
      email: profile.email,
      name: profile.name ?? null,
      googleMetadata: {
        givenName: profile.given_name,
        familyName: profile.family_name,
        picture: profile.picture,
      },
    });

    return { luciaUserId: existingUser.id };
  }

  const luciaUserId = generateIdFromEntropySize(10);
  await db.insert("users", {
    id: luciaUserId,
    googleId: profile.sub,
    email: profile.email,
    name: profile.name ?? null,
    googleMetadata: {
      givenName: profile.given_name,
      familyName: profile.given_name,
      picture: profile.picture,
    },
  });
  return { luciaUserId };
}

export const handleLogin = internalMutation({
  args: {
    sub: v.string(),
    name: v.optional(v.string()),
    given_name: v.optional(v.string()),
    family_name: v.optional(v.string()),
    picture: v.optional(v.string()),
    email: v.string(),
    email_verified: v.boolean(),
  },
  handler: async ({ db }, profile) => {
    const lucia = initializeLucia(new ConvexMutationAdapter(db));

    const { luciaUserId } = await getOrCreateUser(db, profile);
    const session = await lucia.createSession(luciaUserId, {
      // These will be filled out by Convex
      _id: "" as Id<"sessions">,
      _creationTime: 0,
    });

    return session.id;
  },
});
