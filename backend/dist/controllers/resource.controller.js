"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getResourceDetails = exports.getResourceSummary = exports.getResources = void 0;
const db_1 = __importDefault(require("../config/db"));
const getResources = async (req, res) => {
    try {
        const orgId = req.org?.id;
        if (!orgId)
            return res.status(400).json({ success: false, message: "Organization context required" });
        const { provider, type, status, search, page = "1", limit = "10" } = req.query;
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const skip = (pageNum - 1) * limitNum;
        // Build filter query object
        const filter = { organizationId: orgId };
        if (provider) {
            filter.account = { provider: provider };
        }
        if (type) {
            filter.type = type;
        }
        if (status) {
            filter.status = status;
        }
        if (search) {
            filter.OR = [
                { name: { contains: search, mode: "insensitive" } },
                { resourceId: { contains: search, mode: "insensitive" } },
            ];
        }
        // Execute query
        const [resources, totalCount] = await db_1.default.$transaction([
            db_1.default.cloudResource.findMany({
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
            db_1.default.cloudResource.count({ where: filter }),
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
    }
    catch (error) {
        return res.status(500).json({ success: false, message: "Failed to load resources", error: error.message });
    }
};
exports.getResources = getResources;
const getResourceSummary = async (req, res) => {
    try {
        const orgId = req.org?.id;
        if (!orgId)
            return res.status(400).json({ success: false, message: "Organization context required" });
        // 1. Group by provider
        const providers = await db_1.default.cloudResource.groupBy({
            by: ["accountId"],
            where: { organizationId: orgId },
            _count: { id: true },
            _sum: { costDaily: true },
        });
        // We can resolve accounts to mapping names and providers
        const accounts = await db_1.default.cloudAccount.findMany({
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
        const typeGroups = await db_1.default.cloudResource.groupBy({
            by: ["type"],
            where: { organizationId: orgId },
            _count: { id: true },
        });
        const typeSummary = typeGroups.map((g) => ({
            type: g.type,
            count: g._count.id,
        }));
        // 3. Totals
        const totalResources = await db_1.default.cloudResource.count({
            where: { organizationId: orgId },
        });
        const dailySpend = await db_1.default.cloudResource.aggregate({
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
    }
    catch (error) {
        return res.status(500).json({ success: false, message: "Failed to summarize resources", error: error.message });
    }
};
exports.getResourceSummary = getResourceSummary;
const getResourceDetails = async (req, res) => {
    try {
        const orgId = req.org?.id;
        const { id } = req.params;
        if (!orgId)
            return res.status(400).json({ success: false, message: "Organization context required" });
        const resource = await db_1.default.cloudResource.findFirst({
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
    }
    catch (error) {
        return res.status(500).json({ success: false, message: "Failed to load resource details", error: error.message });
    }
};
exports.getResourceDetails = getResourceDetails;
