"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const organization_routes_1 = __importDefault(require("./routes/organization.routes"));
const cloudAccount_routes_1 = __importDefault(require("./routes/cloudAccount.routes"));
const resource_routes_1 = __importDefault(require("./routes/resource.routes"));
const cost_routes_1 = __importDefault(require("./routes/cost.routes"));
const security_routes_1 = __importDefault(require("./routes/security.routes"));
const kubernetes_routes_1 = __importDefault(require("./routes/kubernetes.routes"));
const alert_routes_1 = __importDefault(require("./routes/alert.routes"));
const log_routes_1 = __importDefault(require("./routes/log.routes"));
const billing_routes_1 = __importDefault(require("./routes/billing.routes"));
const app = (0, express_1.default)();
// Middlewares
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin)
            return callback(null, true);
        const allowed = process.env.FRONTEND_URL;
        if (!allowed ||
            origin === allowed ||
            origin.endsWith(".vercel.app") ||
            origin.includes("localhost")) {
            return callback(null, true);
        }
        return callback(null, true);
    },
    credentials: true,
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Manual lightweight cookie parser middleware (for refreshToken cookie)
app.use((req, _res, next) => {
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
// Base Root & Ping routes
app.get("/", (_req, res) => {
    return res.json({
        message: "AI Cloud Cost & Security Advisor API Service",
        status: "healthy",
        version: "1.0.0",
        endpoints: {
            health: "/api/health",
            auth: "/api/auth",
            orgs: "/api/orgs"
        }
    });
});
app.get("/api", (_req, res) => {
    return res.json({
        message: "AI Cloud Cost & Security Advisor API",
        status: "healthy",
        endpoints: {
            health: "/api/health"
        }
    });
});
app.get("/api/health", (_req, res) => {
    return res.json({ success: true, status: "healthy", timestamp: new Date() });
});
// Register Routes
app.use("/api/auth", auth_routes_1.default);
app.use("/api/orgs", organization_routes_1.default);
app.use("/api/accounts", cloudAccount_routes_1.default);
app.use("/api/resources", resource_routes_1.default);
app.use("/api/costs", cost_routes_1.default);
app.use("/api/security", security_routes_1.default);
app.use("/api/kubernetes", kubernetes_routes_1.default);
app.use("/api/alerts", alert_routes_1.default);
app.use("/api/logs", log_routes_1.default);
app.use("/api/billing", billing_routes_1.default);
// Global Error Handler
app.use((err, _req, res, _next) => {
    console.error("Unhandled error:", err);
    return res.status(err.status || 500).json({
        success: false,
        message: err.message || "Internal Server Error",
        error: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
});
exports.default = app;
