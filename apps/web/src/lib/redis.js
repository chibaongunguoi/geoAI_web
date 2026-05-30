import Redis from "ioredis";

// Reuse the Redis connection if it exists (useful for Next.js dev server hot-reloading)
let redis = global.redis || null;

if (!redis && process.env.REDIS_URL) {
  try {
    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      retryStrategy(times) {
        if (times > 3) {
          return null; // Stop retrying after 3 times to avoid hanging
        }
        return Math.min(times * 100, 3000); // Reconnect after 100ms, 200ms, 300ms... max 3000ms
      }
    });

    redis.on("error", (err) => {
      console.error("Redis connection error:", err);
    });

    if (process.env.NODE_ENV !== "production") {
      global.redis = redis;
    }
  } catch (error) {
    console.error("Failed to initialize Redis:", error);
  }
}

/**
 * Lấy dữ liệu từ Cache (nếu có)
 * @param {string} key Key lưu trong Redis
 * @returns {Promise<any|null>} Dữ liệu parse từ JSON hoặc null
 */
export async function getCache(key) {
  if (!redis) return null;
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error(`Redis get error for key ${key}:`, error);
    return null;
  }
}

/**
 * Lưu dữ liệu vào Cache
 * @param {string} key Key lưu trong Redis
 * @param {any} data Dữ liệu cần lưu
 * @param {number} ttl Thời gian sống của cache (giây) - mặc định 300 (5 phút)
 */
export async function setCache(key, data, ttl = 300) {
  if (!redis) return;
  try {
    await redis.set(key, JSON.stringify(data), "EX", ttl);
  } catch (error) {
    console.error(`Redis set error for key ${key}:`, error);
  }
}

/**
 * Xóa cache theo key
 * @param {string} key Key lưu trong Redis
 */
export async function deleteCache(key) {
  if (!redis) return;
  try {
    await redis.del(key);
  } catch (error) {
    console.error(`Redis delete error for key ${key}:`, error);
  }
}

export default redis;
