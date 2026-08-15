import { Request, Response } from "express";
import prisma from "../config/db";
import PDFDocument from "pdfkit";
import { logAuditEvent } from "../middlewares/audit";
import { fireAlert } from "./alert.controller";

export const getBillingDashboard = async (req: Request, res: Response) => {
  try {
    const orgId = req.org?.id;
    if (!orgId) return res.status(400).json({ success: false, message: "Organization context required" });

    const subscription = await prisma.billingSubscription.findUnique({
      where: { organizationId: orgId },
    });

    const invoices = await prisma.invoice.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
    });

    return res.json({
      success: true,
      data: {
        subscription: subscription || { plan: "FREE", status: "ACTIVE" },
        invoices,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: "Failed to load billing metrics", error: error.message });
  }
};

export const updateSubscription = async (req: Request, res: Response) => {
  try {
    const orgId = req.org?.id;
    const { plan } = req.body; // STARTUP or ENTERPRISE

    if (!orgId) return res.status(400).json({ success: false, message: "Organization context required" });
    if (!plan || !["FREE", "STARTUP", "ENTERPRISE"].includes(plan)) {
      return res.status(400).json({ success: false, message: "Valid subscription plan (FREE, STARTUP, ENTERPRISE) is required" });
    }

    const price = plan === "STARTUP" ? 99.00 : plan === "ENTERPRISE" ? 499.00 : 0.00;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update subscription plan
      const subscription = await tx.billingSubscription.upsert({
        where: { organizationId: orgId },
        update: {
          plan,
          status: "ACTIVE",
          endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 days
        },
        create: {
          organizationId: orgId,
          plan,
          status: "ACTIVE",
          endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      // 2. Generate a transaction invoice record if price > 0
      let invoice = null;
      if (price > 0) {
        invoice = await tx.invoice.create({
          data: {
            organizationId: orgId,
            amount: price,
            currency: "USD",
            status: "PAID",
            dueDate: new Date(),
            paidAt: new Date(),
          },
        });
      }

      return { subscription, invoice };
    });

    await logAuditEvent({
      userId: req.user?.userId,
      organizationId: orgId,
      action: "BILLING_SUBSCRIBE",
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.headers["user-agent"],
      details: { plan, amountPaid: price },
    });

    await fireAlert(
      orgId,
      "INFO",
      `Organization subscription updated to ${plan} tier. Thank you for your support!`
    );

    return res.json({
      success: true,
      message: `Successfully subscribed to ${plan} plan`,
      data: result,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: "Failed to update subscription", error: error.message });
  }
};

export const downloadInvoicePdf = async (req: Request, res: Response) => {
  try {
    const orgId = req.org?.id;
    const invoiceId = req.params.invoiceId as string;

    if (!orgId) return res.status(400).json({ success: false, message: "Organization context required" });

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, organizationId: orgId },
      include: {
        organization: true,
      },
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: "Invoice not found" });
    }

    // 1. Create a PDF Kit Document
    const doc = new PDFDocument({ margin: 50 });

    // Stream PDF directly to client response
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=invoice-${invoice.id.substring(0, 8)}.pdf`);
    doc.pipe(res);

    // 2. Build Premium PDF Invoice Layout
    // Header banner
    doc.rect(0, 0, 612, 100).fill("#1e293b"); // Slate dark bg
    doc.fillColor("#ffffff").fontSize(20).text("AI CLOUD ADVISOR", 50, 40, { characterSpacing: 1 });
    doc.fontSize(10).fillColor("#94a3b8").text("Premium Cloud FinOps & Security platform", 50, 65);

    // Invoice Meta
    doc.fillColor("#1e293b").fontSize(14).text("INVOICE RECEIPT", 400, 120, { align: "right" });
    doc.fontSize(9).fillColor("#64748b")
      .text(`Invoice ID: ${invoice.id}`, 400, 140, { align: "right" })
      .text(`Date Issued: ${new Date(invoice.createdAt).toLocaleDateString()}`, 400, 155, { align: "right" })
      .text(`Status: ${invoice.status}`, 400, 170, { align: "right" });

    // Billing Info
    doc.fillColor("#1e293b").fontSize(12).text("Billed To:", 50, 120);
    doc.fontSize(10).fillColor("#334155")
      .text(invoice.organization.name, 50, 140)
      .text("AI Cloud Cost & Security Advisor platform tenant account", 50, 155);

    // Line items table header
    doc.rect(50, 220, 512, 25).fill("#f1f5f9");
    doc.fillColor("#1e293b").fontSize(9).text("Item Description", 60, 228);
    doc.text("Qty", 350, 228, { align: "center" });
    doc.text("Unit Price", 420, 228, { align: "right" });
    doc.text("Total", 500, 228, { align: "right" });

    // Table divider line
    doc.moveTo(50, 245).lineTo(562, 245).strokeColor("#cbd5e1").stroke();

    // Table rows
    const description = `AI Cloud Cost & Security Advisor Subscription - SaaS Tier`;
    doc.fillColor("#334155").text(description, 60, 260, { width: 250 });
    doc.text("1", 350, 260, { align: "center" });
    doc.text(`$${invoice.amount.toFixed(2)}`, 420, 260, { align: "right" });
    doc.text(`$${invoice.amount.toFixed(2)}`, 500, 260, { align: "right" });

    // Bottom Divider
    doc.moveTo(50, 310).lineTo(562, 310).strokeColor("#e2e8f0").stroke();

    // Grand total
    doc.fontSize(12).fillColor("#1e293b")
      .text("Total Amount Paid:", 350, 330, { align: "right", width: 120 })
      .text(`$${invoice.amount.toFixed(2)} ${invoice.currency}`, 480, 330, { align: "right", width: 80 });

    // Footer
    doc.fontSize(8).fillColor("#94a3b8")
      .text("Thank you for choosing AI Cloud Cost & Security Advisor. For inquiries, email billing@aicloudadvisor.io", 50, 700, { align: "center", width: 512 });

    // 3. Finalize PDF
    doc.end();
  } catch (error: any) {
    return res.status(500).json({ success: false, message: "Failed to build invoice PDF receipt", error: error.message });
  }
};
