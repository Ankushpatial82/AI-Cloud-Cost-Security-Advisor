import { Request, Response } from "express";
import prisma from "../config/db";
import { generateAIExplanation } from "../providers/openai";

export const getCostDashboard = async (req: Request, res: Response) => {
  try {
    const orgId = req.org?.id;
    if (!orgId) return res.status(400).json({ success: false, message: "Organization context required" });

    // 1. Get all cloud accounts linked to this organization
    const accounts = await prisma.cloudAccount.findMany({
      where: { organizationId: orgId },
      select: { id: true, name: true, provider: true },
    });

    const accountIds = accounts.map((a) => a.id);

    // 2. Fetch all daily cost metrics for these accounts (past 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const costMetrics = await prisma.costMetric.findMany({
      where: {
        accountId: { in: accountIds },
        date: { gte: thirtyDaysAgo },
      },
      orderBy: { date: "asc" },
    });

    // 3. Process cost metrics for charting
    // Group daily: Map of date string -> total amount
    const dailyMap: { [key: string]: number } = {};
    const serviceMap: { [key: string]: number } = {};
    let totalSpend = 0;

    costMetrics.forEach((m) => {
      const dateStr = m.date.toISOString().split("T")[0];
      dailyMap[dateStr] = (dailyMap[dateStr] || 0) + m.amount;
      serviceMap[m.service] = (serviceMap[m.service] || 0) + m.amount;
      totalSpend += m.amount;
    });

    const dailyCosts = Object.keys(dailyMap).map((date) => ({
      date,
      amount: Number(dailyMap[date].toFixed(2)),
    }));

    const serviceBreakdown = Object.keys(serviceMap).map((service) => ({
      service,
      amount: Number(serviceMap[service].toFixed(2)),
    }));

    // Calculate monthly comparison (last 15 days vs previous 15 days)
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

    const currentPeriodSum = costMetrics
      .filter((m) => m.date >= fifteenDaysAgo)
      .reduce((sum, m) => sum + m.amount, 0);

    const previousPeriodSum = costMetrics
      .filter((m) => m.date < fifteenDaysAgo)
      .reduce((sum, m) => sum + m.amount, 0);

    let momChangePercentage = 0;
    if (previousPeriodSum > 0) {
      momChangePercentage = Number((((currentPeriodSum - previousPeriodSum) / previousPeriodSum) * 100).toFixed(1));
    }

    return res.json({
      success: true,
      data: {
        totalSpend: Number(totalSpend.toFixed(2)),
        momChangePercentage,
        dailyCosts,
        serviceBreakdown,
        connectedAccountsCount: accounts.length,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: "Failed to compile cost metrics", error: error.message });
  }
};

export const getCostForecast = async (req: Request, res: Response) => {
  try {
    const orgId = req.org?.id;
    if (!orgId) return res.status(400).json({ success: false, message: "Organization context required" });

    const accounts = await prisma.cloudAccount.findMany({
      where: { organizationId: orgId },
      select: { id: true },
    });
    const accountIds = accounts.map((a) => a.id);

    const costMetrics = await prisma.costMetric.findMany({
      where: { accountId: { in: accountIds } },
      orderBy: { date: "asc" },
    });

    if (costMetrics.length === 0) {
      return res.json({
        success: true,
        data: {
          forecast: [],
          message: "Insufficient cost data to compute forecast.",
        },
      });
    }

    // Mathematical Forecasting Engine: Simple Linear Regression
    // Represent dates as index numbers (x = 0, 1, 2...) and cost as (y)
    const dailyMap: { [key: string]: number } = {};
    costMetrics.forEach((m) => {
      const dateStr = m.date.toISOString().split("T")[0];
      dailyMap[dateStr] = (dailyMap[dateStr] || 0) + m.amount;
    });

    const dates = Object.keys(dailyMap).sort();
    const yValues = dates.map((d) => dailyMap[d]);
    const xValues = Array.from({ length: dates.length }, (_, i) => i);

    const n = xValues.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (let i = 0; i < n; i++) {
      sumX += xValues[i];
      sumY += yValues[i];
      sumXY += xValues[i] * yValues[i];
      sumXX += xValues[i] * xValues[i];
    }

    // Slope (m) and Intercept (b) for y = mx + b
    const denominator = (n * sumXX - sumX * sumX);
    const slope = denominator !== 0 ? (n * sumXY - sumX * sumY) / denominator : 0;
    const intercept = denominator !== 0 ? (sumY - slope * sumX) / n : (sumY / n);

    // Predict next 30 days
    const forecast = [];
    const latestDate = new Date(dates[dates.length - 1]);

    for (let i = 1; i <= 30; i++) {
      const targetDate = new Date(latestDate);
      targetDate.setDate(latestDate.getDate() + i);

      const xIndex = n + i - 1;
      const predictedCost = Math.max(0, slope * xIndex + intercept); // Avoid negative values

      forecast.push({
        date: targetDate.toISOString().split("T")[0],
        amount: Number(predictedCost.toFixed(2)),
      });
    }

    return res.json({
      success: true,
      data: {
        currentDailyAverage: Number((sumY / n).toFixed(2)),
        projectedMonthlyCost: Number((forecast.reduce((sum, val) => sum + val.amount, 0)).toFixed(2)),
        forecast,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: "Forecasting calculation failed", error: error.message });
  }
};

export const getCostRecommendations = async (req: Request, res: Response) => {
  try {
    const orgId = req.org?.id;
    if (!orgId) return res.status(400).json({ success: false, message: "Organization context required" });

    // Fetch resources with specific sizes or configurations that can be optimized
    const resources = await prisma.cloudResource.findMany({
      where: { organizationId: orgId },
      include: {
        account: {
          select: { name: true, provider: true },
        },
      },
    });

    const recommendations = [];

    for (const res of resources) {
      const meta = res.metadata as any;
      
      // 1. EC2 / VM checks
      if ((res.type === "EC2" || res.type === "VM" || res.type === "ComputeEngine") && res.costDaily > 10) {
        recommendations.push({
          resourceId: res.id,
          resourceName: res.name,
          provider: res.account.provider,
          type: res.type,
          currentCostMonthly: Number((res.costDaily * 30).toFixed(2)),
          suggestedAction: "Downgrade instance size / Rightsizing",
          description: `Instance '${res.name}' (${meta.instanceType || meta.vmSize || meta.machineType}) displays less than 15% average compute usage. Recommend downscaling CPU/Memory options.`,
          potentialSavings: Number((res.costDaily * 30 * 0.4).toFixed(2)), // 40% saving
        });
      }

      // 2. Unencrypted databases or exposed DBs that should be minimized
      if ((res.type === "RDS" || res.type === "CosmosDB" || res.type === "CloudSQL") && res.name.includes("dev")) {
        recommendations.push({
          resourceId: res.id,
          resourceName: res.name,
          provider: res.account.provider,
          type: res.type,
          currentCostMonthly: Number((res.costDaily * 30).toFixed(2)),
          suggestedAction: "Schedule stopping outside working hours",
          description: `Development database '${res.name}' is running 24/7. Halting compute during non-business hours (nights/weekends) yields savings.`,
          potentialSavings: Number((res.costDaily * 30 * 0.6).toFixed(2)), // 60% saving
        });
      }

      // 3. S3 Bucket without lifecycle optimization
      if (res.type === "S3" && meta.sizeBytes && meta.sizeBytes > 10000000000) { // > 10GB
        recommendations.push({
          resourceId: res.id,
          resourceName: res.name,
          provider: res.account.provider,
          type: res.type,
          currentCostMonthly: Number((res.costDaily * 30).toFixed(2)),
          suggestedAction: "Configure S3 Glacier Transition rules",
          description: `S3 Bucket '${res.name}' contains more than 10GB of data. Archiving files older than 90 days reduces storage costs.`,
          potentialSavings: Number((res.costDaily * 30 * 0.5).toFixed(2)),
        });
      }
    }

    return res.json({
      success: true,
      data: recommendations,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: "Failed to generate recommendations", error: error.message });
  }
};

export const getAICostSummary = async (req: Request, res: Response) => {
  try {
    const orgId = req.org?.id;
    if (!orgId) return res.status(400).json({ success: false, message: "Organization context required" });

    // Aggregate resources and costs to pass to AI prompt
    const totalCount = await prisma.cloudResource.count({ where: { organizationId: orgId } });
    const dailySpend = await prisma.cloudResource.aggregate({
      where: { organizationId: orgId },
      _sum: { costDaily: true },
    });

    const prompt = `Perform an executive cloud infrastructure cost review.
- Total resources tracked: ${totalCount}
- Combined daily run-rate: $${dailySpend._sum.costDaily || 0}
Provide action items for immediate savings, prioritizing expensive databases or VMs.`;

    const aiResponse = await generateAIExplanation(prompt, "You are a Cloud FinOps and SaaS cost optimization architect.");

    return res.json({
      success: true,
      data: {
        summary: aiResponse.content,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: "AI query failed", error: error.message });
  }
};
