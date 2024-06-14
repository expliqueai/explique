import { queryWithAuth } from "../withAuth";
import { validateAdminSession } from "./exercises";


export const list = queryWithAuth({
    args: {},
    handler: async ({ db, session }) => {
      validateAdminSession(session);
      const result = [];
      for (const report of await db.query("reports").collect()) {
        const message = await db.get(report.messageId);

        result.push({
            id: report._id,
            attemptId: report.attemptId,
            messageId: report.messageId,
            message: message?.content,
            reason: report.reason,
          })
      }
  
      return result;
    },
  });