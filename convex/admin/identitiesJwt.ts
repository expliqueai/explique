import { ConvexError, v } from "convex/values";
import { queryWithAuth } from "../auth/withAuth";
import * as jsrsasign from "jsrsasign";
import { getCourseRegistration } from "../courses";

export default queryWithAuth({
  args: {
    courseSlug: v.string(),
  },
  handler: async ({ db, session }, { courseSlug }) => {
    await getCourseRegistration(db, session, courseSlug, "admin");

    if (!session) {
      throw new ConvexError("Invariant broken");
    }

    const jwtKey = process.env.ADMIN_API_PRIVATE_KEY;
    if (!jwtKey) {
      console.log("Missing ADMIN_API_PRIVATE_KEY key");
      throw new ConvexError("Configuration issue");
    }

    const jwt = jsrsasign.KJUR.jws.JWS.sign(
      null,
      { alg: "RS256" },
      {
        iss: "https://cs250.epfl.ch",
        iat: jsrsasign.KJUR.jws.IntDate.get("now"),
        exp: jsrsasign.KJUR.jws.IntDate.get("now + 1hour"),
        sub: session.user.identifier,
        aud: "admin",
      },
      jwtKey,
    );

    return jwt;
  },
});
