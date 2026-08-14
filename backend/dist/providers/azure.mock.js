"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncAzureAccount = void 0;
const db_1 = __importDefault(require("../config/db"));
const client_1 = require("@prisma/client");
const syncAzureAccount = async (accountId, orgId) => {
    console.log(`[AZURE SYNC] Starting Azure Discovery Scan for Account: ${accountId}`);
    const mockResources = [
        {
            resourceId: "/subscriptions/123/resourceGroups/prod-rg/providers/Microsoft.Compute/virtualMachines/prod-vm-01",
            name: "prod-vm-01",
            type: "VM",
            region: "eastus",
            status: client_1.ResourceStatus.RUNNING,
            costDaily: 18.20,
            metadata: {
                vmSize: "Standard_D4s_v5",
                publicIp: "20.112.5.43",
                osType: "Ubuntu Server",
            },
        },
        {
            resourceId: "/subscriptions/123/resourceGroups/prod-rg/providers/Microsoft.Storage/storageAccounts/prodstorageaccount",
            name: "prodstorageaccount",
            type: "BlobStorage",
            region: "eastus",
            status: client_1.ResourceStatus.ACTIVE,
            costDaily: 4.50,
            metadata: {
                sku: "Standard_LRS",
                allowBlobPublicAccess: true, // Vulnerability
                encryptionEnabled: true,
            },
        },
        {
            resourceId: "/subscriptions/123/resourceGroups/prod-rg/providers/Microsoft.DocumentDB/databaseAccounts/prod-cosmos-db",
            name: "prod-cosmos-db",
            type: "CosmosDB",
            region: "westus",
            status: client_1.ResourceStatus.RUNNING,
            costDaily: 35.80,
            metadata: {
                offerType: "Standard",
                defaultConsistencyLevel: "Session",
                ipRules: ["0.0.0.0/0"], // Vulnerability - open access
            },
        },
    ];
    const savedResources = [];
    for (const res of mockResources) {
        const saved = await db_1.default.cloudResource.upsert({
            where: {
                accountId_resourceId: {
                    accountId,
                    resourceId: res.resourceId,
                },
            },
            update: {
                name: res.name,
                status: res.status,
                metadata: res.metadata,
                costDaily: res.costDaily,
                updatedAt: new Date(),
            },
            create: {
                organizationId: orgId,
                accountId,
                resourceId: res.resourceId,
                name: res.name,
                type: res.type,
                region: res.region,
                status: res.status,
                metadata: res.metadata,
                costDaily: res.costDaily,
            },
        });
        savedResources.push(saved);
    }
    const storageAcc = savedResources.find(r => r.name === "prodstorageaccount");
    const cosmosDb = savedResources.find(r => r.name === "prod-cosmos-db");
    await db_1.default.securityFinding.deleteMany({
        where: { accountId },
    });
    const mockFindings = [
        {
            ruleId: "AZURE-STORAGE-001",
            title: "Azure Storage Account Allows Public Blob Access",
            description: "The storage account 'prodstorageaccount' allows anonymous public access to containers and blobs, risking data leakage.",
            severity: client_1.FindingSeverity.HIGH,
            resourceId: storageAcc?.id || null,
            remediation: "Disable public access configuration in the Azure Portal or use Terraform to set `allow_blob_public_access = false` on the storage account.",
        },
        {
            ruleId: "AZURE-COSMOS-002",
            title: "Cosmos DB IP Firewall Allow All Rules Enabled",
            description: "The Cosmos DB database 'prod-cosmos-db' has firewall rules allowing ingress from '0.0.0.0/0' (all IPs).",
            severity: client_1.FindingSeverity.CRITICAL,
            resourceId: cosmosDb?.id || null,
            remediation: "Configure the Cosmos DB firewall to restrict access to trusted Virtual Networks, private endpoints, or specific corporate IPs.",
        },
    ];
    for (const f of mockFindings) {
        await db_1.default.securityFinding.create({
            data: {
                organizationId: orgId,
                accountId,
                resourceId: f.resourceId,
                title: f.title,
                description: f.description,
                severity: f.severity,
                remediation: f.remediation,
                ruleId: f.ruleId,
            },
        });
    }
    await db_1.default.costMetric.deleteMany({
        where: { accountId },
    });
    const services = ["VM", "BlobStorage", "CosmosDB"];
    const now = new Date();
    for (let i = 0; i < 30; i++) {
        const date = new Date();
        date.setDate(now.getDate() - i);
        date.setHours(0, 0, 0, 0);
        for (const service of services) {
            let baseAmount = 4.0;
            if (service === "VM")
                baseAmount = 18.20;
            if (service === "BlobStorage")
                baseAmount = 4.50;
            if (service === "CosmosDB")
                baseAmount = 35.80;
            const noise = (Math.cos(i * 0.3) * 0.12 + 1.0);
            const amount = Number((baseAmount * noise).toFixed(2));
            await db_1.default.costMetric.create({
                data: {
                    accountId,
                    service,
                    amount,
                    date,
                },
            }).catch(() => { });
        }
    }
    console.log(`[AZURE SYNC] Azure Sync completed successfully for Account: ${accountId}`);
};
exports.syncAzureAccount = syncAzureAccount;
