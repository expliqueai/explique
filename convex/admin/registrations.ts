import { ConvexError, v } from "convex/values";
import { getCourseRegistration } from "../courses";
import { mutationWithAuth } from "../auth/withAuth";

export default mutationWithAuth({
  args: {
    courseSlug: v.string(),
    users: v.union(
      v.object({
        emails: v.array(v.string()),
      }),
      v.object({
        identifiers: v.array(v.string()),
      }),
    ),
  },
  handler: async ({ db, session }, { courseSlug, users }) => {
    await getCourseRegistration(db, session, courseSlug, "admin");

    // @TODO
    throw new ConvexError("Not implemented");
  },
});
