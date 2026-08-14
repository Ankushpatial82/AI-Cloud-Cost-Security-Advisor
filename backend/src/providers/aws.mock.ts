import prisma from "../config/db";
import { FindingSeverity, ResourceStatus } from "@prisma/client";

export const syncAWSAccount = async (accountId: string, orgId: string) => {
  console.log(`[AWS SYNC] Starting AWS Discovery Scan for Account: ${accountId}`);

  // 1. Mock Resources to insert
  const mockResources = [
    {
      resourceId: "i-0a123bc456def7890",
      name: "prod-web-server",
      type: "EC2",
      region: "us-east-1",
      status: ResourceStatus.RUNNING,
      costDaily: 24.50,
      metadata: {
        instanceType: "t3.xlarge",
        publicIp: "54.210.43.12",
        privateIp: "10.0.1.45",
        ami: "ami-0c7217cdde317cfec",
        volumeSize: "100GB gp3",
      },
    },
    {
      resourceId: "i-0b987fa654fed3210",
      name: "staging-api-server",
      type: "EC2",
      region: "us-west-2",
      status: ResourceStatus.RUNNING,
      costDaily: 6.20,
      metadata: {
        instanceType: "t3.medium",
        publicIp: "34.212.112.5",
        privateIp: "10.1.2.98",
        ami: "ami-0c7217cdde317cfec",
        volumeSize: "50GB gp3",
      },
    },
    {
      resourceId: "arn:aws:s3:::company-financial-reports-2026",
      name: "company-financial-reports-2026",
      type: "S3",
      region: "us-east-1",
      status: ResourceStatus.ACTIVE,
      costDaily: 1.80,
      metadata: {
        sizeBytes: 15243198000, // 15 GB
        versioningEnabled: true,
        publicAccessBlock: true,
        encryptionType: "SSE-KMS",
      },
    },
    {
      resourceId: "arn:aws:s3:::public-assets-static-site",
      name: "public-assets-static-site",
      type: "S3",
      region: "us-east-1",
      status: ResourceStatus.ACTIVE,
      costDaily: 0.45,
      metadata: {
        sizeBytes: 1254000,
        versioningEnabled: false,
        publicAccessBlock: false, // Vulnerability
        encryptionType: "None",
      },
    },
    {
      resourceId: "db-prod-aurora-cluster",
      name: "prod-aurora-cluster",
      type: "RDS",
      region: "us-east-1",
      status: ResourceStatus.RUNNING,
      costDaily: 48.90,
      metadata: {
        engine: "aurora-postgresql",
        engineVersion: "15.4",
        class: "db.r6g.xlarge",
        multiAz: true,
        storageEncrypted: true,
        publiclyAccessible: false,
      },
    },
    {
      resourceId: "db-dev-mysql-exposed",
      name: "dev-mysql-exposed",
      type: "RDS",
      region: "us-west-2",
      status: ResourceStatus.RUNNING,
      costDaily: 12.10,
      metadata: {
        engine: "mysql",
        engineVersion: "8.0.32",
        class: "db.t3.medium",
        multiAz: false,
        storageEncrypted: false, // Vulnerability
        publiclyAccessible: true, // Vulnerability
      },
    },
    {
      resourceId: "arn:aws:lambda:us-east-1:123456789012:function:process-billing",
      name: "process-billing",
      type: "Lambda",
      region: "us-east-1",
      status: ResourceStatus.ACTIVE,
      costDaily: 2.15,
      metadata: {
        runtime: "nodejs18.x",
        timeout: 30,
        memorySize: 512,
      },
    },
    {
      resourceId: "eks-prod-cluster-01",
      name: "prod-kubernetes-cluster",
      type: "EKS",
      region: "us-east-1",
      status: ResourceStatus.ACTIVE,
      costDaily: 73.00, // high cost
      metadata: {
        version: "1.28",
        vpcId: "vpc-0abc123d",
        endpoint: "https://D45123.gr7.us-east-1.eks.amazonaws.com",
      },
    },
  ];

  // 2. Perform upsert of discovered resources in DB
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

  // Find DB IDs of the created resources to link findings
  const publicS3 = savedResources.find(r => r.name === "public-assets-static-site");
  const exposedRDS = savedResources.find(r => r.name === "dev-mysql-exposed");

  // 3. Clear existing security findings for this account and recreate
  await prisma.securityFinding.deleteMany({
    where: { accountId },
  });

  const mockFindings = [
    {
      ruleId: "AWS-S3-001",
      title: "S3 Bucket Publicly Accessible",
      description: "The S3 bucket 'public-assets-static-site' does not block public access. Standard permissions allow anonymous users to list or fetch data.",
      severity: FindingSeverity.HIGH,
      resourceId: publicS3?.id || null,
      remediation: "Enable 'Block public access' in the Amazon S3 console or configure a bucket policy that explicitly limits access to verified AWS IAM identities.",
    },
    {
      ruleId: "AWS-RDS-002",
      title: "RDS Database Publicly Exposed",
      description: "The RDS instance 'dev-mysql-exposed' has 'PubliclyAccessible' set to true, making it reachable over the open Internet.",
      severity: FindingSeverity.CRITICAL,
      resourceId: exposedRDS?.id || null,
      remediation: "Modify the database configuration to disable public accessibility, and assign it to private subnets accessible only via VPC Security Groups or NAT Gateways.",
    },
    {
      ruleId: "AWS-RDS-001",
      title: "RDS Database Unencrypted",
      description: "The database 'dev-mysql-exposed' is running without storage encryption enabled. In-flight and rest data are vulnerable to physical breaches.",
      severity: FindingSeverity.MEDIUM,
      resourceId: exposedRDS?.id || null,
      remediation: "Take a snapshot of the database, copy the snapshot with encryption enabled (AWS KMS key), and restore a new encrypted database instance.",
    },
    {
      ruleId: "AWS-SG-001",
      title: "Security Group Port 22 (SSH) Open to the World",
      description: "A default security group ruleset allows inbound TCP port 22 traffic from CIDR '0.0.0.0/0'. This exposes instances to automated brute-force attacks.",
      severity: FindingSeverity.HIGH,
      resourceId: null,
      remediation: "Modify security group inbound rules to only allow SSH access from specific, verified IP ranges (e.g. corporate VPN IP).",
    },
    {
      ruleId: "AWS-IAM-003",
      title: "Excessive Admin Permissions on IAM Role",
      description: "The 'AdminRole' role has policy 'AdministratorAccess' assigned. Least Privilege principle is violated.",
      severity: FindingSeverity.MEDIUM,
      resourceId: null,
      remediation: "Perform IAM Access Analyzer checks to verify active permissions, remove '*' capabilities, and attach tight micro-policies instead.",
    }
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

  // 4. Populate Cost history (last 30 days)
  await prisma.costMetric.deleteMany({
    where: { accountId },
  });

  const services = ["EC2", "RDS", "S3", "Lambda", "EKS"];
  const now = new Date();

  for (let i = 0; i < 30; i++) {
    const date = new Date();
    date.setDate(now.getDate() - i);
    date.setHours(0, 0, 0, 0);

    for (const service of services) {
      // Create some fluctuation in the pricing
      let baseAmount = 5.0;
      if (service === "EC2") baseAmount = 30.70;
      if (service === "RDS") baseAmount = 61.00;
      if (service === "S3") baseAmount = 2.25;
      if (service === "Lambda") baseAmount = 2.15;
      if (service === "EKS") baseAmount = 73.00;

      // Add a sin wave or random fluctuation to make the charts look interesting
      const noise = (Math.sin(i * 0.4) * 0.15 + 1.0); // +-15%
      const amount = Number((baseAmount * noise).toFixed(2));

      await prisma.costMetric.create({
        data: {
          accountId,
          service,
          amount,
          date,
        },
      }).catch(() => {
        // Ignore unique constraint errors in concurrent dev scenarios
      });
    }
  }

  console.log(`[AWS SYNC] AWS Sync completed successfully for Account: ${accountId}`);
};
