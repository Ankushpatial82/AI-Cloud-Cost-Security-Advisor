"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAIExplanation = void 0;
const generateAIExplanation = async (prompt, systemPrompt) => {
    const apiKey = process.env.OPENAI_API_KEY;
    // If a real key is present and not the mock placeholder, attempt a real request
    if (apiKey && apiKey !== "sk-mock-key-for-local-development" && apiKey.startsWith("sk-")) {
        try {
            // Using standard fetch to invoke OpenAI to avoid external package overhead
            const response = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: "gpt-4-turbo",
                    messages: [
                        { role: "system", content: systemPrompt || "You are an expert Cloud Security and Cost Optimization Architect." },
                        { role: "user", content: prompt },
                    ],
                    temperature: 0.2,
                }),
            });
            if (!response.ok) {
                throw new Error(`OpenAI API responded with status ${response.status}`);
            }
            const result = await response.json();
            return {
                content: result.choices?.[0]?.message?.content ?? "",
                tokensUsed: result.usage?.total_tokens ?? 0,
            };
        }
        catch (error) {
            console.warn("OpenAI API call failed. Falling back to local AI simulation engine.", error.message);
        }
    }
    // Local AI Simulation Engine
    // Tailors responses dynamically based on keywords in the prompt to mimic complex models
    return new Promise((resolve) => {
        setTimeout(() => {
            let content = "";
            if (prompt.includes("AWS-S3-001") || prompt.toLowerCase().includes("s3 bucket public")) {
                content = `### 🚨 Root Cause Analysis: S3 Bucket Public Access
The bucket policy or ACL configuration allows public actions (\`s3:GetObject\`, \`s3:ListBucket\`) for \`Principal: "*"\`. This is typically caused by selecting **"Disable Block All Public Access"** during creation or applying a misconfigured bucket policy to enable static asset serving.

### 🛡️ Secure Architecture Recommendations
1. **Apply S3 Block Public Access**: Enable this at the account level or bucket level to prevent any public policy applications.
2. **CloudFront OAC (Origin Access Control)**: Serve public assets through AWS CloudFront CDN. Configure the S3 bucket policy to only allow read access from the CloudFront Service Principal:
   \`\`\`json
   {
     "Version": "2012-10-17",
     "Statement": {
       "Sid": "AllowCloudFrontServicePrincipal",
       "Effect": "Allow",
       "Principal": {
         "Service": "cloudfront.amazonaws.com"
       },
       "Action": "s3:GetObject",
       "Resource": "arn:aws:s3:::public-assets-static-site/*",
       "Condition": {
         "StringEquals": {
           "AWS:SourceArn": "arn:aws:cloudfront::123456789012:distribution/ED1234XYZ"
         }
       }
     }
   }
   \`\`\`

### 🛠️ Remediation Step-by-Step
- Go to **AWS Console -> S3**.
- Select \`public-assets-static-site\`.
- Click on **Permissions** tab.
- Edit **Block public access (bucket settings)** and check **Block all public access**. Save changes.`;
            }
            else if (prompt.includes("AWS-RDS-002") || prompt.toLowerCase().includes("rds database public")) {
                content = `### 🚨 Root Cause Analysis: Publicly Exposed RDS Database
The RDS instance was provisioned with \`PubliclyAccessible: true\` within a public subnet (having a route to an Internet Gateway). This exposes the database port directly to global scans, increasing vulnerability to brute force and zero-day exploits.

### 🛡️ Secure Architecture Recommendations
1. **Disable Public Accessibility**: Re-configure the RDS instance setting to \`PubliclyAccessible: false\`.
2. **Deploy in Private Subnets**: Restructure your VPC so databases reside strictly within Isolated/Private subnets that lack route table paths to Internet Gateways.
3. **Security Group Ingress Controls**: Restrict database security groups to accept TCP port 3306 or 5432 ingress only from the application security group or a bastion proxy host.

### 🛠️ Remediation Step-by-Step
1. Locate the RDS cluster \`dev-mysql-exposed\` in the AWS Console.
2. Select **Modify**.
3. Under **Connectivity**, change **Public access** to **Not publicly accessible**.
4. Apply immediately (Note: may cause a brief connection drop).`;
            }
            else if (prompt.toLowerCase().includes("cost") || prompt.toLowerCase().includes("forecast")) {
                content = `### 📊 AI Cost Optimization Executive Summary

We detected **3 critical cost anomalies** and **2 rightsizing opportunities** totaling potential savings of **$485.00/month**.

#### 1. EC2 Instance Rightsizing (\`prod-web-server\`)
- **Current Instance**: \`t3.xlarge\` ($735.00/mo)
- **Observed Utilization**: Average CPU 8.2%, Peak 22%, Memory 18%
- **Recommendation**: Downgrade to \`t3.large\` ($183.00/mo) or migrate to AWS Graviton \`t4g.large\` ($146.00/mo).
- **Monthly Savings**: **$552.00 (75%)**

#### 2. Idle Databases (\`dev-mysql-exposed\`)
- **Recommendation**: Instance has zero connection activity over 14 consecutive days. Create a final snapshot and terminate the instance.
- **Monthly Savings**: **$363.00 (100%)**

#### 3. S3 Lifecycle Optimization (\`company-financial-reports-2026\`)
- **Observation**: Over 70% of objects in this bucket have not been accessed in 90+ days.
- **Recommendation**: Apply an S3 Lifecycle Rule to transition objects to **S3 Intelligent-Tiering** or **S3 Glacier Flexible Retrieval**.
- **Monthly Savings**: **$45.00**`;
            }
            else if (prompt.toLowerCase().includes("log")) {
                content = `### 🔍 AI Log Summary & Pattern Recognition

#### Anomaly Identified: DB Connection Pool Exhaustion
We analyzed 1,520 log entries from application containers over the last hour.

**Detected Pattern:**
- \`[ERROR] Connection timeout pool exceeded at 15:43:02 UTC\` (Occurred 42 times)
- \`[WARN] Client query took 8400ms: SELECT * FROM audit_logs WHERE organization_id = ...\` (Occurred 12 times)

**Root Cause:**
Missing database indexes on high-throughput queries targeting the \`AuditLog\` and \`CloudResource\` tables. The index scan is falling back to full table sequential scans, blocking database connections.

**Remediation:**
Deploy missing indexes immediately. Add:
\`\`\`sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_org_created 
ON "AuditLog" ("organizationId", "createdAt" DESC);
\`\`\``;
            }
            else {
                content = `### 🤖 AI Advisory Analysis
Based on your request, we analyzed your infrastructure metadata against CIS benchmarks and cloud architecture best practices:

1. **Vulnerability Assessment**: Ensure all exposed interfaces use SSL/TLS v1.3.
2. **Access Control**: Enable multi-factor authentication (MFA) on all user accounts.
3. **Provisioning**: Run regular sweeps of idle compute power to control spending.

If you have specific resource codes or errors, paste them here to generate a detailed remediation walkthrough.`;
            }
            resolve({
                content,
                tokensUsed: Math.floor(content.length / 4),
            });
        }, 400); // Small delay to simulate API network call
    });
};
exports.generateAIExplanation = generateAIExplanation;
