"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bullmq_1 = require("bullmq");
const redis_1 = __importDefault(require("../config/redis"));
const db_1 = __importDefault(require("../config/db"));
const aws_mock_1 = require("../providers/aws.mock");
const azure_mock_1 = require("../providers/azure.mock");
const gcp_mock_1 = require("../providers/gcp.mock");
const worker = new bullmq_1.Worker("cloud-discovery", async (job) => {
    const { accountId, orgId, provider } = job.data;
    console.log(`[WORKER] Starting cloud discovery sync for job ${job.id} (Account: ${accountId}, Provider: ${provider})`);
    try {
        if (provider === "AWS") {
            await (0, aws_mock_1.syncAWSAccount)(accountId, orgId);
        }
        else if (provider === "AZURE") {
            await (0, azure_mock_1.syncAzureAccount)(accountId, orgId);
        }
        else if (provider === "GCP") {
            await (0, gcp_mock_1.syncGCPAccount)(accountId, orgId);
        }
        else {
            throw new Error(`Unsupported cloud provider: ${provider}`);
        }
        // Mark the account as valid and updated
        await db_1.default.cloudAccount.update({
            where: { id: accountId },
            data: {
                isValid: true,
                lastValidated: new Date(),
            },
        });
        console.log(`[WORKER] Successfully completed cloud sync for account ${accountId}`);
    }
    catch (error) {
        console.error(`[WORKER] Failed cloud sync for account ${accountId}:`, error);
        // Update account status to invalid in case of errors
        await db_1.default.cloudAccount.update({
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
}, {
    connection: redis_1.default,
    concurrency: 2, // process up to 2 syncs in parallel
});
worker.on("completed", (job) => {
    console.log(`[WORKER] Job ${job.id} has completed!`);
});
worker.on("failed", (job, err) => {
    console.error(`[WORKER] Job ${job?.id} failed:`, err);
});
exports.default = worker;
