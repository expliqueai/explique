import { ConvexError, v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { action, mutation } from "./_generated/server";
import { getAuth, getEpflAuth, getGoogleAuth } from "./auth/lucia";
import { actionAuthDbWriter, mutationAuthDbWriter } from "./authDbWriter";
import { OAuthRequestError } from "@lucia-auth/oauth";
import * as TequilaLucia from "./lucia_tequila";

export const getLoginUrl = action({
  args: {
    external: v.optional(v.literal(true)),
  },
  async handler(ctx, { external }) {
    const auth = external
      ? getGoogleAuth(actionAuthDbWriter(ctx))
      : getEpflAuth(actionAuthDbWriter(ctx));

    const [url] = await auth.getAuthorizationUrl();
    return url.toString();
  },
});

export const redirect = action({
  args: {
    code: v.string(),
  },
  handler: async (ctx, { code }) => {
    const auth = getAuth(actionAuthDbWriter(ctx));
    const googleAuth = getEpflAuth(actionAuthDbWriter(ctx));

    try {
      const { getExistingUser, googleUser, createUser } =
        await googleAuth.validateCallback(code);

      const getUser = async () => {
        const existingUser = await getExistingUser();
        if (existingUser) return existingUser;

        const email = googleUser.email;
        if (!email) throw new ConvexError("Can’t retrieve your email address");

        const user = await createUser({
          attributes: {
            name: googleUser.name,
            email,

            // These will be filled out by Convex
            _id: "" as Id<"users">,
            _creationTime: 0,
          },
        });
        return user;
      };

      const user = await getUser();
      const session = await auth.createSession({
        userId: user.userId,
        attributes: {
          // These will be filled out by Convex
          _id: "" as Id<"sessions">,
          _creationTime: 0,
        },
      });

      return session.sessionId;
    } catch (e) {
      if (e instanceof OAuthRequestError) {
        throw new ConvexError("Invalid code " + code);
      }
      throw e;
    }
  },
});

export const tequilaLogin = mutation({
  args: { jwt: v.string() },
  handler: async (ctx, { jwt }) => {
    const sub = TequilaLucia.validateToken(jwt);
    if (sub === false) {
      throw new ConvexError("Invalid authentication token");
    }

    const user = await TequilaLucia.getOrCreateUser(sub, ctx.db);

    const auth = getAuth(mutationAuthDbWriter(ctx.db));
    const session = await auth.createSession({
      userId: user.userId,
      attributes: {
        // These will be filled out by Convex
        _id: "" as Id<"sessions">,
        _creationTime: 0,
      },
    });

    return session.sessionId;
  },
});
