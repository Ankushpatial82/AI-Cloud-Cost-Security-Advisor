import { Request, Response } from "express";
import prisma from "../config/db";
import { CloudProvider, ResourceStatus } from "@prisma/client";

export const getResources = async (req: Request, res: Response) => {
  try {
    const orgId = req.org?.id;
    if (!orgId) return res.status(400).json({ success: false, message: "Organization context required" });

    const {
      provider,
      type,
      status,
      search,
      page = "1",
      limit = "10"
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build filter query object
    const filter: any = { organizationId: orgId };

    if (provider) {
      filter.account = { provider: provider as CloudProvider };
    }
    if (type) {
      filter.type = type as string;
    }
    if (status) {
      filter.status = status as ResourceStatus;
    }
    if (search) {
      filter.OR = [
        { name: { contains: search as string, mode: "insensitive" } },
        { resourceId: { contains: search as string, mode: "insensitive" } },
      ];
    }

    // Execute query
    const [resources, totalCount] = await prisma.$transaction([
      prisma.cloudResource.findMany({
        where: filter,
        skip,
        take: limitNum,
        orderBy: { createdAt: "desc" },
        include: {
          account: {
            select: {
              name: true,
              provider: true,
            },
          },
        },
      }),
      prisma.cloudResource.count({ where: filter }),
    ]);

    return res.json({
      success: true,
      data: {
        resources,
        pagination: {
          total: totalCount,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(totalCount / limitNum),
        },
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: "Failed to load resources", error: error.message });
  }
};

export const getResourceSummary = async (req: Request, res: Response) => {
  try {
    const orgId = req.org?.id;
    if (!orgId) return res.status(400).json({ success: false, message: "Organization context required" });

    // 1. Group by provider
    const providers = await prisma.cloudResource.groupBy({
      by: ["accountId"],
      where: { organizationId: orgId },
      _count: { id: true },
      _sum: { costDaily: true },
    });

    // We can resolve accounts to mapping names and providers
    const accounts = await prisma.cloudAccount.findMany({
      where: { organizationId: orgId },
      select: { id: true, name: true, provider: true },
    });

    const providerSummary = accounts.map((acc) => {
      const stats = providers.find((p) => p.accountId === acc.id);
      return {
        accountId: acc.id,
        accountName: acc.name,
        provider: acc.provider,
        count: stats?._count.id || 0,
        dailyCost: stats?._sum.costDaily || 0,
      };
    });

    // 2. Group by type
    const typeGroups = await prisma.cloudResource.groupBy({
      by: ["type"],
      where: { organizationId: orgId },
      _count: { id: true },
    });

    const typeSummary = typeGroups.map((g) => ({
      type: g.type,
      count: g._count.id,
    }));

    // 3. Totals
    const totalResources = await prisma.cloudResource.count({
      where: { organizationId: orgId },
    });

    const dailySpend = await prisma.cloudResource.aggregate({
      where: { organizationId: orgId },
      _sum: { costDaily: true },
    });

    return res.json({
      success: true,
      data: {
        totalResources,
        totalDailySpend: dailySpend._sum.costDaily || 0,
        byProvider: providerSummary,
        byType: typeSummary,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: "Failed to summarize resources", error: error.message });
  }
};
export const getResourceDetails = async (req: Request, res: Response) => {
  try {
    const orgId = req.org?.id;
    const { id } = req.params;

    if (!orgId) return res.status(400).json({ success: false, message: "Organization context required" });

    const resource = await prisma.cloudResource.findFirst({
      where: { id, organizationId: orgId },
      include: {
        account: {
          select: {
            name: true,
            provider: true,
          },
        },
        findings: true,
      },
    });

    if (!resource) {
      return res.status(404).json({ success: false, message: "Resource not found" });
    }

    return res.json({ success: true, data: resource });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: "Failed to load resource details", error: error.message });
  }
};
