import { internalMutation } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { v } from "convex/values";

export const migrateLectureChunksToSeparateTable = internalMutation({
  args: {
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    console.log("Starting lecture chunks migration...");
    
    let migratedCount = 0;
    let totalChunks = 0;
    let skippedCount = 0;
    let lastId: Id<"lectures"> | null = null;
    const BATCH_SIZE = args.batchSize || 1; // Default to 1 lecture at a time to avoid memory issues
    
    while (true) {
      // Get only lecture IDs and whether they have chunks, not the full data
      let query = ctx.db.query("lectures");
      if (lastId) {
        query = query.filter((q) => q.gt(q.field("_id"), lastId));
      }
      
      // First, just get the IDs without loading the chunks
      const lectureIds = await query
        .filter((q) => q.neq(q.field("chunks"), undefined))
        .take(BATCH_SIZE);
      
      if (lectureIds.length === 0) {
        break; // No more lectures to process
      }
      
      for (const lectureInfo of lectureIds) {
        try {
          // Now fetch the full lecture with chunks
          const lecture = await ctx.db.get(lectureInfo._id);
          
          if (!lecture || !lecture.chunks || lecture.chunks.length === 0) {
            continue;
          }
          
          console.log(`Migrating lecture ${lecture._id} with ${lecture.chunks.length} chunks`);
          
          // Check if chunks are too large (rough estimate)
          const estimatedSize = JSON.stringify(lecture.chunks).length;
          if (estimatedSize > 10_000_000) { // 10MB limit per lecture
            console.warn(`Skipping lecture ${lecture._id} - chunks too large (${estimatedSize} bytes)`);
            skippedCount++;
            lastId = lecture._id;
            continue;
          }
          
          // Insert chunks into the new table in batches
          const CHUNK_BATCH_SIZE = 50; // Insert 50 chunks at a time
          for (let i = 0; i < lecture.chunks.length; i += CHUNK_BATCH_SIZE) {
            const batchEnd = Math.min(i + CHUNK_BATCH_SIZE, lecture.chunks.length);
            
            for (let j = i; j < batchEnd; j++) {
              await ctx.db.insert("lectureChunks", {
                lectureId: lecture._id,
                content: lecture.chunks[j],
                order: j,
              });
              totalChunks++;
            }
          }
          
          // Clear chunks from the lecture
          await ctx.db.patch(lecture._id, { chunks: undefined });
          migratedCount++;
        } catch (error) {
          console.error(`Error migrating lecture ${lectureInfo._id}:`, error);
          skippedCount++;
        }
        
        // Update lastId for next iteration
        lastId = lectureInfo._id;
      }
    }
    
    console.log(`Migration complete: ${migratedCount} lectures migrated with ${totalChunks} total chunks`);
    if (skippedCount > 0) {
      console.log(`Skipped ${skippedCount} lectures due to size constraints or errors`);
    }
    return { migratedLectures: migratedCount, totalChunks, skippedLectures: skippedCount };
  },
});

export const rollbackLectureChunksMigration = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("Starting rollback of lecture chunks migration...");
    
    let rolledBackCount = 0;
    let skippedCount = 0;
    let lastId: Id<"lectures"> | null = null;
    const BATCH_SIZE = 1; // Process 1 lecture at a time
    
    while (true) {
      // Get a batch of lecture IDs with pagination
      let query = ctx.db.query("lectures");
      if (lastId) {
        query = query.filter((q) => q.gt(q.field("_id"), lastId));
      }
      const lectures = await query.take(BATCH_SIZE);
      
      if (lectures.length === 0) {
        break; // No more lectures to process
      }
      
      for (const lecture of lectures) {
        try {
          // Check if there are chunks for this lecture
          const chunkCount = await ctx.db
            .query("lectureChunks")
            .withIndex("by_lecture_id", (q) => q.eq("lectureId", lecture._id))
            .collect()
            .then(chunks => chunks.length);
          
          if (chunkCount === 0) {
            continue;
          }
          
          console.log(`Rolling back lecture ${lecture._id} with ${chunkCount} chunks`);
          
          // Get chunks in batches to avoid memory issues
          const CHUNK_BATCH_SIZE = 100;
          const allChunks = [];
          
          for (let offset = 0; offset < chunkCount; offset += CHUNK_BATCH_SIZE) {
            const chunkBatch = await ctx.db
              .query("lectureChunks")
              .withIndex("by_lecture_id", (q) => q.eq("lectureId", lecture._id))
              .order("asc")
              .take(CHUNK_BATCH_SIZE);
            
            allChunks.push(...chunkBatch);
          }
          
          // Check size before restoring
          const estimatedSize = JSON.stringify(allChunks).length;
          if (estimatedSize > 10_000_000) { // 10MB limit
            console.warn(`Skipping rollback for lecture ${lecture._id} - chunks too large (${estimatedSize} bytes)`);
            skippedCount++;
            lastId = lecture._id;
            continue;
          }
          
          // Restore chunks to the lecture
          const chunkContents = allChunks
            .sort((a, b) => a.order - b.order)
            .map((c) => c.content);
          
          await ctx.db.patch(lecture._id, { chunks: chunkContents });
          
          // Delete chunks from the new table
          for (const chunk of allChunks) {
            await ctx.db.delete(chunk._id);
          }
          
          rolledBackCount++;
        } catch (error) {
          console.error(`Error rolling back lecture ${lecture._id}:`, error);
          skippedCount++;
        }
        
        // Update lastId for next iteration
        lastId = lecture._id;
      }
    }
    
    console.log(`Rollback complete: ${rolledBackCount} lectures rolled back`);
    if (skippedCount > 0) {
      console.log(`Skipped ${skippedCount} lectures due to size constraints or errors`);
    }
    return { rolledBackLectures: rolledBackCount, skippedLectures: skippedCount };
  },
});