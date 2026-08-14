"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ioredis_1 = __importDefault(require("ioredis"));
const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379/0";
const redis = new ioredis_1.default(REDIS_URL, {
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
exports.default = redis;
