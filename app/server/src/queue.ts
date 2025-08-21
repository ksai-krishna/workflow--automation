import { Queue } from "bullmq";
import * as IORedis from "ioredis"; // BullMQ requires an ioredis client
import { env } from "./env.js";

// Create the connection instance using ioredis.
// The REDIS_URL from Railway typically includes the password (token).
// Example: "redis://default:YOUR_PASSWORD@your-host:your-port"
export const connection = new IORedis.Redis(process.env.RAILWAY_REDDIS_URL || env.RAILWAY_REDDIS_URL, {
  maxRetriesPerRequest: null,
});


// Export the queue, passing the configured ioredis connection.
export const jobQueue = new Queue("workflow-jobs", { connection });
