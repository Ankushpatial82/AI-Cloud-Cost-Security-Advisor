import dotenv from "dotenv";
dotenv.config();

import app from "./app";
// Boot the background discovery worker
import "./jobs/discovery.worker";

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`🚀 AI Cloud Cost & Security Advisor API running on port ${PORT}`);
});

// Handle graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  server.close(() => {
    console.log("Process terminated.");
  });
});
