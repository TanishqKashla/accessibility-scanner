import { Queue } from "bullmq";
import { getRedisConnection } from "./connection";

function createQueue(name: string) {
  return new Queue(name, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential" as const, delay: 2000 },
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
    },
  });
}

// Lazy singletons — queues are created on first access, not at import time.
// This prevents `next build` from crashing when REDIS_URL is unavailable.
let _seedQueue: Queue | null = null;
let _crawlQueue: Queue | null = null;
let _auditQueue: Queue | null = null;
let _aggregateQueue: Queue | null = null;
let _exportQueue: Queue | null = null;

export const seedQueue = new Proxy({} as Queue, {
  get(_, prop) { _seedQueue ??= createQueue("seed"); return (_seedQueue as never)[prop]; },
});
export const crawlQueue = new Proxy({} as Queue, {
  get(_, prop) { _crawlQueue ??= createQueue("crawl"); return (_crawlQueue as never)[prop]; },
});
export const auditQueue = new Proxy({} as Queue, {
  get(_, prop) { _auditQueue ??= createQueue("audit"); return (_auditQueue as never)[prop]; },
});
export const aggregateQueue = new Proxy({} as Queue, {
  get(_, prop) { _aggregateQueue ??= createQueue("aggregate"); return (_aggregateQueue as never)[prop]; },
});
export const exportQueue = new Proxy({} as Queue, {
  get(_, prop) { _exportQueue ??= createQueue("export"); return (_exportQueue as never)[prop]; },
});

export const allQueues = { seedQueue, crawlQueue, auditQueue, aggregateQueue, exportQueue };
