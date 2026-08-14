"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.queueDiscoveryJob = exports.discoveryQueue = void 0;
const bullmq_1 = require("bullmq");
const redis_1 = __importDefault(require("../config/redis"));
exports.discoveryQueue = new bullmq_1.Queue("cloud-discovery", {
    connection: redis_1.default,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: "exponential",
            delay: 5000,
        },
        removeOnComplete: true,
        removeOnFail: false,
    },
});
const queueDiscoveryJob = async (accountId, orgId, provider) => {
    await exports.discoveryQueue.add(`sync-${accountId}`, {
        accountId,
        orgId,
        provider,
    });
    console.log(`Job queued: cloud sync for account ${accountId} (Provider: ${provider})`);
};
exports.queueDiscoveryJob = queueDiscoveryJob;
