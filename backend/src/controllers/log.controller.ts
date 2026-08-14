import { Request, Response } from "express";
import prisma from "../config/db";
import { generateAIExplanation } from "../providers/openai";

export const analyzeLogs = async (req: Request, res: Response) => {
  try {
    const orgId = req.org?.id;
    const { logs } = req.body; // Expect raw logs in text format

    if (!orgId) return res.status(400).json({ success: false, message: "Organization context required" });
    if (!logs || typeof logs !== "string") {
      return res.status(400).json({ success: false, message: "Raw logs payload as a string is required" });
    }

    // 1. Analyze logs locally for quick count matches
    const errorCount = (logs.match(/error|fail|critical|exception/gi) || []).length;
    const warningCount = (logs.match(/warn|warning/gi) || []).length;

    // Extract some matching lines
    const logLines = logs.split("\n");
    const errorLines = logLines.filter(line => 
      /error|fail|exception|timeout/i.test(line)
    ).slice(0, 5); // Keep first 5 matches

    // 2. Call OpenAI (or mock fallback) for deep diagnosis
    const prompt = `Review the following container log snippets and diagnose the infrastructure issues.
- Error lines detected: ${errorCount}
- Warning lines detected: ${warningCount}
Log Sample:
${errorLines.join("\n")}

Suggest root-cause explanations and steps to resolve these faults.`;

    const aiAnalysis = await generateAIExplanation(prompt, "You are a senior DevOps, systems engineer, and SRE AI assistant.");

    return res.json({
      success: true,
      data: {
        summary: {
          totalLinesParsed: logLines.length,
          errorsFound: errorCount,
          warningsFound: warningCount,
        },
        diagnostics: aiAnalysis.content,
        matchedErrors: errorLines,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: "Log analysis failed", error: error.message });
  }
};
