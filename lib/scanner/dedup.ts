import { getRedisConnection } from "../queue/connection";

function visitedKey(scanId: string): string {
  return `visited:${scanId}`;
}

/**
 * Check if a normalized URL has already been visited for this scan.
 */
export async function isVisited(scanId: string, normalizedUrl: string): Promise<boolean> {
  const redis = getRedisConnection();
  return (await redis.sismember(visitedKey(scanId), normalizedUrl)) === 1;
}

/**
 * Mark a normalized URL as visited. Returns true if it was newly added.
 */
export async function markVisited(scanId: string, normalizedUrl: string): Promise<boolean> {
  const redis = getRedisConnection();
  return (await redis.sadd(visitedKey(scanId), normalizedUrl)) === 1;
}

/**
 * Get count of visited URLs for a scan.
 */
export async function getVisitedCount(scanId: string): Promise<number> {
  const redis = getRedisConnection();
  return redis.scard(visitedKey(scanId));
}

/**
 * Clean up visited set for a scan (call after scan completes).
 */
export async function clearVisited(scanId: string): Promise<void> {
  const redis = getRedisConnection();
  await redis.del(visitedKey(scanId));
}
