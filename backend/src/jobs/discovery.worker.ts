import { Worker, Job } from "bullmq";
import redis from "../config/redis";
import prisma from "../config/db";
import { syncAWSAccount } from "../providers/aws.mock";
import { syncAzureAccount } from "../providers/azure.mock";
import { syncGCPAccount } from "../providers/gcp.mock";

const worker = new Worker(
  "cloud-discovery",
  async (job: Job) => {
    const { accountId, orgId, provider } = job.data;
    console.log(`[WORKER] Starting cloud discovery sync for job ${job.id} (Account: ${accountId}, Provider: ${provider})`);

    try {
      if (provider === "AWS") {
        await syncAWSAccount(accountId, orgId);
      } else if (provider === "AZURE") {
        await syncAzureAccount(accountId, orgId);
      } else if (provider === "GCP") {
        await syncGCPAccount(accountId, orgId);
      } else {
        throw new Error(`Unsupported cloud provider: ${provider}`);
      }

      // Mark the account as valid and updated
      await prisma.cloudAccount.update({
        where: { id: accountId },
        data: {
          isValid: true,
          lastValidated: new Date(),
        },
      });

      console.log(`[WORKER] Successfully completed cloud sync for account ${accountId}`);
    } catch (error: any) {
      console.error(`[WORKER] Failed cloud sync for account ${accountId}:`, error);
      
      // Update account status to invalid in case of errors
      await prisma.cloudAccount.update({
        where: { id: accountId },
        data: {
          isValid: false,
          lastValidated: new Date(),
        },
      }).catch((dbErr) => {
        console.error(`[WORKER] Failed to mark account as invalid:`, dbErr);
      });

      throw error; // Re-throw for BullMQ to handle retry/failure logging
    }
  },
  {
    connection: redis as any,
    concurrency: 2, // process up to 2 syncs in parallel
  }
);

worker.on("completed", (job) => {
  console.log(`[WORKER] Job ${job.id} has completed!`);
});

worker.on("failed", (job, err) => {
  console.error(`[WORKER] Job ${job?.id} failed:`, err);
});

export default worker;
