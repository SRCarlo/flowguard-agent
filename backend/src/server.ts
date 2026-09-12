import "dotenv/config";

import express from "express";
import cors from "cors";

import { startSlackBot } from "./slack/slackBot.js";

import { getServiceMetrics } from "./tools/metricsTool.js";
import { searchLogs } from "./tools/logsTool.js";
import { getRecentDeployments } from "./tools/deploymentsTool.js";

import { rollbackService } from "./tools/remediationTool.js";
import { verifyServiceHealth } from "./tools/healthTool.js";

import { getTimeline } from "./services/incidentTimeline.js";
import { getIncidentState } from "./services/incidentState.js";

import agentRoutes from "./routes/agentRoutes.js";
import demoRoutes from "./routes/demoRoutes.js";

import { resetDemoEnvironment } from "./tools/resetDemoTool.js";

const app = express();

const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

app.use(
  cors({
    origin: "http://localhost:3001",
  }),
);

app.use("/api/agent", agentRoutes);

app.use("/api/demo", demoRoutes);

app.get("/", (_req, res) => {
  res.json({
    name: "FlowGuard",
    description: "AI Incident Commander that lives in Slack",
    status: "running",
  });
});

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "flowguard-agent",
  });
});

app.get("/api/incidents/state", (_req, res) => {
  res.json(getIncidentState());
});

app.get("/api/incidents/timeline", (_req, res) => {
  res.json({
    timeline: getTimeline(),
  });
});

app.get("/api/services/:service/metrics", (req, res) => {
  const metrics = getServiceMetrics(req.params.service);

  if (!metrics) {
    return res.status(404).json({
      error: `Metrics not found for ${req.params.service}`,
    });
  }

  res.json(metrics);
});

app.get("/api/services/:service/logs", (req, res) => {
  const logs = searchLogs(
    req.params.service,
    req.query.q as string | undefined,
  );

  res.json({
    service: req.params.service,
    logs,
  });
});

app.get("/api/services/:service/deployments", (req, res) => {
  const deployments = getRecentDeployments(req.params.service);

  res.json({
    service: req.params.service,
    deployments,
  });
});

app.post("/api/incidents/approve-rollback", async (req, res) => {
  const { service, targetVersion, approved } = req.body;

  if (approved !== true) {
    return res.status(403).json({
      error: "Human approval is required before rollback.",
    });
  }

  if (!service || !targetVersion) {
    return res.status(400).json({
      error: "service and targetVersion are required.",
    });
  }

  try {
    console.log("🚨 HUMAN APPROVAL RECEIVED", {
      service,
      targetVersion,
    });

    const rollbackResult = await rollbackService(service, targetVersion);

    console.log("🔄 Rollback result:", rollbackResult);

    const healthResult = await verifyServiceHealth(service);

    console.log("🩺 Health verification:", healthResult);

    res.json({
      rollback: rollbackResult,
      health: healthResult,
    });
  } catch (error) {
    console.error("Rollback API failed:", error);

    res.status(500).json({
      error: "Rollback execution failed.",
    });
  }
});

app.post("/api/demo/reset", async (_req, res) => {
  try {
    const result = await resetDemoEnvironment();

    res.json(result);
  } catch (error) {
    console.error("Demo reset failed:", error);

    res.status(500).json({
      success: false,
      error: "Failed to reset demo environment.",
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 FlowGuard backend running on http://localhost:${PORT}`);
});

startSlackBot().catch((error) => {
  console.error("Failed to start Slack bot:", error);
});
