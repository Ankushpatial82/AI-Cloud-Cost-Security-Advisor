import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes";
import organizationRoutes from "./routes/organization.routes";
import cloudAccountRoutes from "./routes/cloudAccount.routes";
import resourceRoutes from "./routes/resource.routes";
import costRoutes from "./routes/cost.routes";
import securityRoutes from "./routes/security.routes";
import kubernetesRoutes from "./routes/kubernetes.routes";
import alertRoutes from "./routes/alert.routes";
import logRoutes from "./routes/log.routes";
import billingRoutes from "./routes/billing.routes";

const app = express();

// Middlewares
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Manual lightweight cookie parser middleware (for refreshToken cookie)
app.use((req: Request, _res: Response, next: NextFunction) => {
  const cookieHeader = req.headers.cookie;
  req.cookies = {};
  if (cookieHeader) {
    cookieHeader.split(";").forEach((cookie) => {
      const parts = cookie.split("=");
      const name = parts[0].trim();
      const value = parts.slice(1).join("=").trim();
      req.cookies[name] = decodeURIComponent(value);
    });
  }
  next();
});

// Base API Ping route
app.get("/api/health", (_req: Request, res: Response) => {
  return res.json({ success: true, status: "healthy", timestamp: new Date() });
});

// Register Routes
app.use("/api/auth", authRoutes);
app.use("/api/orgs", organizationRoutes);
app.use("/api/accounts", cloudAccountRoutes);
app.use("/api/resources", resourceRoutes);
app.use("/api/costs", costRoutes);
app.use("/api/security", securityRoutes);
app.use("/api/kubernetes", kubernetesRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/logs", logRoutes);
app.use("/api/billing", billingRoutes);

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err);
  return res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    error: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

export default app;
