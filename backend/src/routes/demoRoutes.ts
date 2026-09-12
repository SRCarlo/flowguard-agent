import { Router } from "express";

import { getServiceMetrics } from "../tools/metricsTool.js";
import { getRecentDeployments } from "../tools/deploymentsTool.js";
import { runIncidentCommander } from "../agents/incidentCommander.js";

import { addTimelineEvent } from "../services/incidentTimeline.js";
import { updateIncidentState } from "../services/incidentState.js";

import { slackApp } from "../services/slackService.js";
import { buildIncidentMessage } from "../slack/incidentMessage.js";

const router = Router();

function extractSection(text: string, section: string): string {
  if (!text) {
    return "";
  }

  const escapedSection = section.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const regex = new RegExp(
    `(?:^|\\n)(?:#+\\s*)?${escapedSection}\\s*\\n([\\s\\S]*?)(?=\\n(?:#+\\s*)?[A-Z][A-Z ]+\\s*\\n|$)`,
    "i",
  );

  const match = regex.exec(text);

  return match?.[1]?.trim() || "";
}

router.post("/trigger", async (_req, res) => {
  try {
    const service = "checkout-api";

    const metrics = getServiceMetrics(service);
    const deployments = getRecentDeployments(service);

    if (!metrics) {
      return res.status(500).json({
        success: false,
        error: "Demo metrics are unavailable.",
      });
    }

    if (deployments.length < 2) {
      return res.status(500).json({
        success: false,
        error: "Demo deployment data is unavailable.",
      });
    }

    const incidentVersion = deployments[0].version;
    const targetVersion = deployments[1].version;

    const incident =
      "checkout-api is experiencing a 42.1% error rate and 8420ms latency. " +
      "Around 2400 requests are failing. " +
      `Version ${incidentVersion} was deployed shortly before the incident. ` +
      "Investigate the root cause using metrics, deployments, logs, and the runbook. " +
      "Recommend the safest remediation. Human approval is required before rollback.";

    updateIncidentState({
      active: true,
      status: "investigating",
      service,
      incident,
      incidentVersion,
      currentVersion: incidentVersion,
      targetVersion,
      incidentErrorRate: metrics.error_rate,
      incidentLatencyMs: metrics.latency_ms,
      recoveryErrorRate: undefined,
      recoveryLatencyMs: undefined,
      analysis: "",
      rootCause: "",
      confidence: "",
    });

    addTimelineEvent(
      "Incident detected",
      `Production alert detected for ${service}.`,
    );

    console.log("");
    console.log("========================================");
    console.log("FLOWGUARD DEMO INCIDENT");
    console.log("========================================");
    console.log(`Service: ${service}`);
    console.log(`Current version: ${incidentVersion}`);
    console.log(`Rollback target: ${targetVersion}`);
    console.log("========================================");
    console.log("");

    res.status(200).json({
      success: true,
      message: "Demo incident triggered. AI investigation started.",
      service,
      incidentVersion,
      targetVersion,
    });

    try {
      console.log("FlowGuard AI investigation started...");

      const analysis = await runIncidentCommander(incident);

      console.log("");
      console.log("FLOWGUARD AI INVESTIGATION COMPLETE");
      console.log(analysis);
      console.log("");

      const rootCause =
        extractSection(analysis, "LIKELY ROOT CAUSE") ||
        "FlowGuard identified a likely root cause from the collected evidence.";

      const confidence =
        extractSection(analysis, "CONFIDENCE") ||
        "Based on the available incident evidence.";

      updateIncidentState({
        active: true,
        status: "awaiting_approval",
        service,
        incident,
        incidentVersion,
        currentVersion: incidentVersion,
        targetVersion,
        incidentErrorRate: metrics.error_rate,
        incidentLatencyMs: metrics.latency_ms,
        recoveryErrorRate: undefined,
        recoveryLatencyMs: undefined,
        analysis,
        rootCause,
        confidence,
      });

      addTimelineEvent(
        "Human approval required",
        `FlowGuard recommends rollback from ${incidentVersion} to ${targetVersion}.`,
      );

      const slackChannelId = process.env.SLACK_CHANNEL_ID;

      if (!slackChannelId) {
        console.error(
          "SLACK_CHANNEL_ID is missing. AI investigation completed but Slack notification was not sent.",
        );

        addTimelineEvent(
          "Slack notification failed",
          "SLACK_CHANNEL_ID is missing from the backend .env file.",
        );

        return;
      }

      const slackMessage = buildIncidentMessage(analysis);

      await slackApp.client.chat.postMessage({
        channel: slackChannelId,
        ...slackMessage,
      });

      addTimelineEvent(
        "Slack incident posted",
        "FlowGuard posted the AI investigation and approval request to Slack.",
      );

      console.log("FlowGuard incident posted to Slack.");
      console.log(
        `Waiting for human approval: ${incidentVersion} -> ${targetVersion}`,
      );
    } catch (error) {
      console.error("FlowGuard AI investigation failed:", error);

      updateIncidentState({
        active: true,
        status: "failed",
      });

      addTimelineEvent(
        "Investigation failed",
        "FlowGuard encountered an error during the AI investigation.",
      );
    }
  } catch (error) {
    console.error("Demo trigger failed:", error);

    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        error: "Failed to trigger demo incident.",
      });
    }
  }
});

export default router;
