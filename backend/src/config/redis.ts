import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379/0";

const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null, // Required by BullMQ
  retryStrategy(times) {
    // Exponential backoff with a cap at 3 seconds
    const delay = Math.min(times * 200, 3000);
    return delay;
  },
});

let isConnected = false;

redis.on("connect", () => {
  if (!isConnected) {
    console.log("🔌 Connected to Redis successfully");
    isConnected = true;
  }
});

redis.on("error", (err) => {
  if (isConnected) {
    console.error("❌ Redis connection error:", err.message || err);
    isConnected = false;
  }
});

export default redis;

