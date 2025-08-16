import { internalMutation } from "../_generated/server";
import { Id } from "../_generated/dataModel";

export const migrateLectureChunksToSeparateTable = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("Starting lecture chunks migration...");
    
    let migratedCount = 0;
    let totalChunks = 0;
    let lastId: Id<"lectures"> | null = null;
    const BATCH_SIZE = 10; // Process 10 lectures at a time
    
    while (true) {
      // Get a batch of lectures with pagination
      let query = ctx.db.query("lectures");
      if (lastId) {
        query = query.filter((q) => q.gt(q.field("_id"), lastId));
      }
      const lectures = await query.take(BATCH_SIZE);
      
      if (lectures.length === 0) {
        break; // No more lectures to process
      }
      
      for (const lecture of lectures) {
        // Skip if no chunks or already migrated (empty chunks array)
        if (!lecture.chunks || lecture.chunks.length === 0) {
          continue;
        }
        
        console.log(`Migrating lecture ${lecture._id} with ${lecture.chunks.length} chunks`);
        
        // Insert chunks into the new table
        for (let i = 0; i < lecture.chunks.length; i++) {
          await ctx.db.insert("lectureChunks", {
            lectureId: lecture._id,
            content: lecture.chunks[i],
            order: i,
          });
          totalChunks++;
        }
        
        // Clear chunks from the lecture
        await ctx.db.patch(lecture._id, { chunks: undefined });
        migratedCount++;
      }
      
      // Update lastId for next iteration
      lastId = lectures[lectures.length - 1]._id;
    }
    
    console.log(`Migration complete: ${migratedCount} lectures migrated with ${totalChunks} total chunks`);
    return { migratedLectures: migratedCount, totalChunks };
  },
});

export const rollbackLectureChunksMigration = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("Starting rollback of lecture chunks migration...");
    
    let rolledBackCount = 0;
    let lastId: Id<"lectures"> | null = null;
    const BATCH_SIZE = 10; // Process 10 lectures at a time
    
    while (true) {
      // Get a batch of lectures with pagination
      let query = ctx.db.query("lectures");
      if (lastId) {
        query = query.filter((q) => q.gt(q.field("_id"), lastId));
      }
      const lectures = await query.take(BATCH_SIZE);
      
      if (lectures.length === 0) {
        break; // No more lectures to process
      }
      
      for (const lecture of lectures) {
        // Get chunks for this lecture from the new table
        const chunks = await ctx.db
          .query("lectureChunks")
          .withIndex("by_lecture_id", (q) => q.eq("lectureId", lecture._id))
          .order("asc")
          .collect();
        
        if (chunks.length === 0) {
          continue;
        }
        
        console.log(`Rolling back lecture ${lecture._id} with ${chunks.length} chunks`);
        
        // Restore chunks to the lecture
        const chunkContents = chunks
          .sort((a, b) => a.order - b.order)
          .map((c) => c.content);
        
        await ctx.db.patch(lecture._id, { chunks: chunkContents });
        
        // Delete chunks from the new table
        for (const chunk of chunks) {
          await ctx.db.delete(chunk._id);
        }
        
        rolledBackCount++;
      }
      
      // Update lastId for next iteration
      lastId = lectures[lectures.length - 1]._id;
    }
    
    console.log(`Rollback complete: ${rolledBackCount} lectures rolled back`);
    return { rolledBackLectures: rolledBackCount };
  },
});