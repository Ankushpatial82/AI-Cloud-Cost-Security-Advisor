"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateFindingStatus = exports.explainFinding = exports.getFindings = exports.getSecurityDashboard = void 0;
const db_1 = __importDefault(require("../config/db"));
const openai_1 = require("../providers/openai");
const getSecurityDashboard = async (req, res) => {
    try {
        const orgId = req.org?.id;
        if (!orgId)
            return res.status(400).json({ success: false, message: "Organization context required" });
        // Fetch findings count aggregated by severity
        const findings = await db_1.default.securityFinding.findMany({
            where: { organizationId: orgId, status: "OPEN" },
            select: { severity: true },
        });
        const severityCounts = {
            CRITICAL: 0,
            HIGH: 0,
            MEDIUM: 0,
            LOW: 0,
        };
        findings.forEach((f) => {
            severityCounts[f.severity] = (severityCounts[f.severity] || 0) + 1;
        });
        // Risk Scoring Algorithm (Out of 100)
        // Deduct points based on severity counts
        const criticalDeduction = severityCounts.CRITICAL * 15;
        const highDeduction = severityCounts.HIGH * 8;
        const mediumDeduction = severityCounts.MEDIUM * 3;
        const lowDeduction = severityCounts.LOW * 1;
        const securityScore = Math.max(10, 100 - (criticalDeduction + highDeduction + mediumDeduction + lowDeduction));
        // CIS Compliance check estimation
        // Mocks percentage based on amount of critical issues
        const totalChecks = 25;
        const failedChecks = severityCounts.CRITICAL + severityCounts.HIGH;
        const compliancePercentage = Math.max(40, Math.round(((totalChecks - failedChecks) / totalChecks) * 100));
        return res.json({
            success: true,
            data: {
                securityScore,
                compliancePercentage,
                severityCounts,
                totalOpenFindings: findings.length,
            },
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: "Failed to load security summary", error: error.message });
    }
};
exports.getSecurityDashboard = getSecurityDashboard;
const getFindings = async (req, res) => {
    try {
        const orgId = req.org?.id;
        if (!orgId)
            return res.status(400).json({ success: false, message: "Organization context required" });
        const { severity, status, provider } = req.query;
        const filter = { organizationId: orgId };
        if (severity) {
            filter.severity = severity;
        }
        if (status) {
            filter.status = status;
        }
        else {
            filter.status = "OPEN"; // Default to open issues
        }
        if (provider) {
            filter.account = { provider };
        }
        const findings = await db_1.default.securityFinding.findMany({
            where: filter,
            include: {
                account: {
                    select: { name: true, provider: true },
                },
                resource: {
                    select: { name: true, type: true, status: true },
                },
            },
            orderBy: { createdAt: "desc" },
        });
        return res.json({ success: true, data: findings });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: "Failed to load findings", error: error.message });
    }
};
exports.getFindings = getFindings;
const explainFinding = async (req, res) => {
    try {
        const orgId = req.org?.id;
        const findingId = req.params.findingId;
        if (!orgId)
            return res.status(400).json({ success: false, message: "Organization context required" });
        const finding = await db_1.default.securityFinding.findFirst({
            where: { id: findingId, organizationId: orgId },
            include: { account: true },
        });
        if (!finding) {
            return res.status(404).json({ success: false, message: "Finding not found" });
        }
        // Return cached explanation if it already exists
        if (finding.aiExplanation) {
            return res.json({ success: true, data: { explanation: finding.aiExplanation } });
        }
        // Otherwise generate via OpenAI (or mock fallback)
        const prompt = `Analyze cloud security vulnerability:
Finding: ${finding.title}
Code: ${finding.ruleId}
Severity: ${finding.severity}
Cloud Provider: ${finding.account.provider}
Description: ${finding.description}
Remediation Guideline: ${finding.remediation}

Provide a root-cause explanation and the specific command-line or console steps required to remediate this vulnerability.`;
        const aiResponse = await (0, openai_1.generateAIExplanation)(prompt, "You are a cloud infrastructure cybersecurity auditor and DevSecOps specialist.");
        // Cache explanation in DB
        await db_1.default.securityFinding.update({
            where: { id: findingId },
            data: { aiExplanation: aiResponse.content },
        });
        return res.json({
            success: true,
            data: {
                explanation: aiResponse.content,
            },
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: "Failed to generate AI remediation steps", error: error.message });
    }
};
exports.explainFinding = explainFinding;
const updateFindingStatus = async (req, res) => {
    try {
        const orgId = req.org?.id;
        const findingId = req.params.findingId;
        const { status } = req.body; // RESOLVED or MUTED
        if (!orgId)
            return res.status(400).json({ success: false, message: "Organization context required" });
        if (!status || !["OPEN", "RESOLVED", "MUTED"].includes(status)) {
            return res.status(400).json({ success: false, message: "Valid status (OPEN, RESOLVED, MUTED) is required" });
        }
        const finding = await db_1.default.securityFinding.findFirst({
            where: { id: findingId, organizationId: orgId },
        });
        if (!finding) {
            return res.status(404).json({ success: false, message: "Finding not found" });
        }
        const updated = await db_1.default.securityFinding.update({
            where: { id: findingId },
            data: { status: status },
        });
        return res.json({
            success: true,
            message: `Vulnerability status updated to ${status}`,
            data: updated,
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: "Failed to update vulnerability status", error: error.message });
    }
};
exports.updateFindingStatus = updateFindingStatus;
