import { Queue } from "bullmq";
import { getRedisConnection } from "./connection";

const defaultOpts = {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential" as const, delay: 2000 },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
};

export const seedQueue = new Queue("seed", defaultOpts);
export const crawlQueue = new Queue("crawl", defaultOpts);
export const auditQueue = new Queue("audit", defaultOpts);
export const aggregateQueue = new Queue("aggregate", defaultOpts);
export const exportQueue = new Queue("export", defaultOpts);

export const allQueues = { seedQueue, crawlQueue, auditQueue, aggregateQueue, exportQueue };
