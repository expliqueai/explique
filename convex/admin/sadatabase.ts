import { v } from "convex/values";
import {
    mutationWithAuth,
    queryWithAuth,
} from "../auth/withAuth";
import { getCourseRegistration } from "../courses";

export const list = queryWithAuth({
    args: {
      courseSlug: v.string(),
    },
    handler: async ({ db, session, storage }, { courseSlug }) => {
      const { course } = await getCourseRegistration(
        db,
        session,
        courseSlug,
        "admin",
      );
  
      const files = await db
        .query("saDatabase")
        .withIndex("by_course", (q) =>
          q.eq("courseId", course._id),
        )
        .collect();
  
      const result = [];
      for (const file of files) {
        const date = new Date(file._creationTime);

        result.push({
          name: file.name,
          creationTime: date.toUTCString(),
          week: file.week,
        });
      }
  
      return result;
    },
});

export const built = queryWithAuth({
    args: {
      courseSlug: v.string(),
    },
    handler: async ({ db, session, storage }, { courseSlug }) => {
      const { course } = await getCourseRegistration(
        db,
        session,
        courseSlug,
        "admin",
      );
  
      const file = await db
        .query("saDatabase")
        .withIndex("by_course", (q) =>
          q.eq("courseId", course._id),
        )
        .first();
  
      return (file !== null);
    },
});

export const uploadFile = mutationWithAuth({
    args: {
        courseSlug: v.string(),
        week: v.number(),
        name: v.string(),
        storageIds: v.array(v.object({
            pageNumber: v.number(),
            storageId: v.id("_storage"),
          }),)
    },
    handler: async (ctx, { courseSlug, week, name, storageIds }) => {
        const { course } = await getCourseRegistration(
            ctx.db,
            ctx.session,
            courseSlug,
            "admin",
        );

        const files = await ctx.db
            .query("saDatabase")
            .withIndex("by_course", (q) =>
                q.eq("courseId", course._id),
            )
            .collect()
        
        if (files.find(file => file.name === name) !== undefined) return false;

        await ctx.db.insert("saDatabase", {
            courseId: course._id,
            name: name,
            week: week,
            storageIds: storageIds
        });

        return true;
    },
});

export const deleteFile = mutationWithAuth({
    args: {
        courseSlug: v.string(),
        name: v.string(),
    },
    handler: async (ctx, { courseSlug, name }) => {
        const { course } = await getCourseRegistration(
            ctx.db,
            ctx.session,
            courseSlug,
            "admin",
        );

        const files = await ctx.db
            .query("saDatabase")
            .withIndex("by_course", (q) =>
                q.eq("courseId", course._id),
            )
            .collect()
        
        const file = files.find(file => file.name === name);
        if (file === undefined) return;
        for (const storageId of file.storageIds) {
            await ctx.storage.delete(storageId.storageId);
        }
        
        return await ctx.db.delete(file._id);
    },
});


export const generateUploadUrl = mutationWithAuth({
    args: {},
    handler: async (ctx, {}) => {
        return await ctx.storage.generateUploadUrl();
    },
});

export const getUrl = queryWithAuth({
    args: {
        courseSlug: v.string(),
        name: v.string(),
    },
    handler: async (ctx, {courseSlug, name}) => {
        const { course } = await getCourseRegistration(
            ctx.db,
            ctx.session,
            courseSlug,
            "admin",
        );

        const files = await ctx.db
            .query("saDatabase")
            .withIndex("by_course", (q) =>
                q.eq("courseId", course._id),
            )
            .collect()
        
        const file = files.find(file => file.name === name);
        const storageId = file?.storageIds.find(obj => obj.pageNumber === 0)?.storageId;
        if (file === undefined || storageId === undefined) {
            return null;
        } else {
            return await ctx.storage.getUrl(storageId);
        }
    },
  });