import { Queue } from "bullmq";
import redis from "../config/redis";

export const discoveryQueue = new Queue("cloud-discovery", {
  connection: redis as any,
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

export const queueDiscoveryJob = async (accountId: string, orgId: string, provider: string) => {
  await discoveryQueue.add(`sync-${accountId}`, {
    accountId,
    orgId,
    provider,
  });
  console.log(`Job queued: cloud sync for account ${accountId} (Provider: ${provider})`);
};
