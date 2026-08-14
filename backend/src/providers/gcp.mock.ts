import prisma from "../config/db";
import { FindingSeverity, ResourceStatus } from "@prisma/client";

export const syncGCPAccount = async (accountId: string, orgId: string) => {
  console.log(`[GCP SYNC] Starting GCP Discovery Scan for Account: ${accountId}`);

  const mockResources = [
    {
      resourceId: "projects/my-gcp-project/zones/us-central1-a/instances/prod-gce-vm",
      name: "prod-gce-vm",
      type: "ComputeEngine",
      region: "us-central1",
      status: ResourceStatus.RUNNING,
      costDaily: 14.10,
      metadata: {
        machineType: "e2-standard-4",
        publicIp: "35.192.4.98",
        network: "default",
      },
    },
    {
      resourceId: "projects/my-gcp-project/global/buckets/gcs-unencrypted-backup",
      name: "gcs-unencrypted-backup",
      type: "CloudStorage",
      region: "us-central1",
      status: ResourceStatus.ACTIVE,
      costDaily: 6.80,
      metadata: {
        storageClass: "STANDARD",
        uniformBucketLevelAccess: false, // Vulnerability
        encryptionType: "Google-managed", // KMS would be better
      },
    },
    {
      resourceId: "projects/my-gcp-project/instances/prod-cloud-sql-postgres",
      name: "prod-cloud-sql-postgres",
      type: "CloudSQL",
      region: "us-east4",
      status: ResourceStatus.RUNNING,
      costDaily: 28.50,
      metadata: {
        databaseVersion: "POSTGRES_14",
        tier: "db-custom-2-7680",
        ipv4Enabled: true,
        sslMode: "ALLOW_UNENCRYPTED_AND_ENCRYPTED", // Vulnerability
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

  const bucket = savedResources.find(r => r.name === "gcs-unencrypted-backup");
  const cloudSql = savedResources.find(r => r.name === "prod-cloud-sql-postgres");

  await prisma.securityFinding.deleteMany({
    where: { accountId },
  });

  const mockFindings = [
    {
      ruleId: "GCP-GCS-001",
      title: "GCS Bucket Without Uniform Bucket-Level Access Enabled",
      description: "Bucket-level access settings are not uniform, allowing potential object-level ACL misconfigurations that leak content.",
      severity: FindingSeverity.MEDIUM,
      resourceId: bucket?.id || null,
      remediation: "Enable Uniform Bucket-Level Access on the Cloud Storage bucket to ensure IAM policies govern permissions uniformly.",
    },
    {
      ruleId: "GCP-SQL-002",
      title: "Cloud SQL Allows SSL-Less Connections",
      description: "The Cloud SQL instance 'prod-cloud-sql-postgres' accepts unencrypted (non-SSL) database connections.",
      severity: FindingSeverity.HIGH,
      resourceId: cloudSql?.id || null,
      remediation: "Configure the database flag `require_ssl = on` to ensure all external data transfers are encrypted in-transit.",
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

  const services = ["ComputeEngine", "CloudStorage", "CloudSQL"];
  const now = new Date();

  for (let i = 0; i < 30; i++) {
    const date = new Date();
    date.setDate(now.getDate() - i);
    date.setHours(0, 0, 0, 0);

    for (const service of services) {
      let baseAmount = 5.0;
      if (service === "ComputeEngine") baseAmount = 14.10;
      if (service === "CloudStorage") baseAmount = 6.80;
      if (service === "CloudSQL") baseAmount = 28.50;

      const noise = (Math.sin(i * 0.5) * 0.10 + 1.0);
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

  console.log(`[GCP SYNC] GCP Sync completed successfully for Account: ${accountId}`);
};
