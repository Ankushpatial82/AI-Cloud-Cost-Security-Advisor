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
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
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
// Base API Ping route
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
