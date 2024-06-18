import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.weekly(
  "delete expired sessions",
  {
    dayOfWeek: "monday",
    hourUTC: 3,
    minuteUTC: 14,
  },
  internal.auth.cron.default,
);

export default crons;
