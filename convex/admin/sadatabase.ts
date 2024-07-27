import { v } from "convex/values";
import {
    mutationWithAuth,
    queryWithAuth,
} from "../auth/withAuth";
import { getCourseRegistration } from "../courses";
import { internalQuery } from "../_generated/server";


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
        result.push({
          name: file.name,
          creationTime: file._creationTime,
          week: file.week,
        });
      }
  
      return result;
    },
});

export const get = queryWithAuth({
    args: {
        courseSlug: v.string(),
        name: v.optional(v.string()),
    },
    handler: async (ctx, { courseSlug, name }) => {
        if (name === undefined) return false;

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
            .collect();
        
        return files.some((file) => file.name === name);
    }
})

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
  
      return await db
        .query("saDatabase")
        .withIndex("by_course", (q) =>
          q.eq("courseId", course._id),
        )
        .first();
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

        await ctx.db.insert("saDatabase", {
            courseId: course._id,
            name: name,
            week: week,
            storageIds: storageIds
        });
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

export const getUrls = internalQuery({
    args: {
        courseId: v.id("courses"),
    },
    handler: async (ctx, { courseId }) => {

        const files = await ctx.db
            .query("saDatabase")
            .withIndex("by_course", (q) =>
                q.eq("courseId", courseId),
            )
            .collect()
        
        const urls = [];
        for (const file of files) {
            if (file === undefined) continue;
            for (const storageId of file.storageIds) {
                if (storageId.pageNumber === 0 || storageId.storageId === undefined) {
                    continue;
                } else {
                    const url = await ctx.storage.getUrl(storageId.storageId);
                    if (url === null) continue;
                    urls.push(url);
                }  
            }
        }

        return urls;
    },
});