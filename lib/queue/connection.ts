import IORedis from "ioredis";
import { logger } from "../logger";

let connection: IORedis | null = null;

export function getRedisConnection(): IORedis {
  if (connection) return connection;

  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error("REDIS_URL environment variable is not set");
  }

  connection = new IORedis(url, {
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: false,
    tls: url.startsWith("rediss://") ? {} : undefined,
  });

  connection.on("error", (err: Error) => {
    logger.error({ err }, "Redis connection error");
  });

  connection.on("connect", () => {
    logger.info("Redis connected");
  });

  return connection;
}
