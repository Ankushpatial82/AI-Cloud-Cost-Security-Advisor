import prisma from "../config/db";
import { FindingSeverity, ResourceStatus } from "@prisma/client";

export const syncAzureAccount = async (accountId: string, orgId: string) => {
  console.log(`[AZURE SYNC] Starting Azure Discovery Scan for Account: ${accountId}`);

  const mockResources = [
    {
      resourceId: "/subscriptions/123/resourceGroups/prod-rg/providers/Microsoft.Compute/virtualMachines/prod-vm-01",
      name: "prod-vm-01",
      type: "VM",
      region: "eastus",
      status: ResourceStatus.RUNNING,
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
      status: ResourceStatus.ACTIVE,
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
      status: ResourceStatus.RUNNING,
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
    const saved = await prisma.cloudResource.upsert({
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

  await prisma.securityFinding.deleteMany({
    where: { accountId },
  });

  const mockFindings = [
    {
      ruleId: "AZURE-STORAGE-001",
      title: "Azure Storage Account Allows Public Blob Access",
      description: "The storage account 'prodstorageaccount' allows anonymous public access to containers and blobs, risking data leakage.",
      severity: FindingSeverity.HIGH,
      resourceId: storageAcc?.id || null,
      remediation: "Disable public access configuration in the Azure Portal or use Terraform to set `allow_blob_public_access = false` on the storage account.",
    },
    {
      ruleId: "AZURE-COSMOS-002",
      title: "Cosmos DB IP Firewall Allow All Rules Enabled",
      description: "The Cosmos DB database 'prod-cosmos-db' has firewall rules allowing ingress from '0.0.0.0/0' (all IPs).",
      severity: FindingSeverity.CRITICAL,
      resourceId: cosmosDb?.id || null,
      remediation: "Configure the Cosmos DB firewall to restrict access to trusted Virtual Networks, private endpoints, or specific corporate IPs.",
    },
  ];

  for (const f of mockFindings) {
    await prisma.securityFinding.create({
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

  await prisma.costMetric.deleteMany({
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
      if (service === "VM") baseAmount = 18.20;
      if (service === "BlobStorage") baseAmount = 4.50;
      if (service === "CosmosDB") baseAmount = 35.80;

      const noise = (Math.cos(i * 0.3) * 0.12 + 1.0);
      const amount = Number((baseAmount * noise).toFixed(2));

      await prisma.costMetric.create({
        data: {
          accountId,
          service,
          amount,
          date,
        },
      }).catch(() => {});
    }
  }

  console.log(`[AZURE SYNC] Azure Sync completed successfully for Account: ${accountId}`);
};
