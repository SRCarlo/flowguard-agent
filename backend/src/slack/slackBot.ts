import { slackApp } from "../services/slackService.js";

import { runIncidentCommander } from "../agents/incidentCommander.js";

import { buildIncidentMessage } from "./incidentMessage.js";

import { rollbackService } from "../tools/remediationTool.js";

import { verifyServiceHealth } from "../tools/healthTool.js";

import {
  addTimelineEvent,
  clearTimeline,
} from "../services/incidentTimeline.js";

import { generatePostmortem } from "../services/postmortemService.js";

import { getServiceMetrics } from "../tools/metricsTool.js";

import { getRecentDeployments } from "../tools/deploymentsTool.js";

import {
  getIncidentState,
  updateIncidentState,
} from "../services/incidentState.js";

let lastIncident = "";

let lastAnalysis = "";

let rollbackInProgress = false;

function extractSection(text: string, section: string): string {
  if (!text) {
    return "";
  }

  const escaped = section.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const regex = new RegExp(
    `${escaped}\\s*\\n([\\s\\S]*?)(?=\\n[A-Z][A-Z ]+\\s*\\n|$)`,
    "i",
  );

  const match = text.match(regex);

  return match?.[1]?.trim() || "";
}

function detectService(incident: string): string {
  const normalized = incident.toLowerCase();

  if (normalized.includes("checkout-api")) {
    return "checkout-api";
  }

  if (normalized.includes("payment-api")) {
    return "payment-api";
  }

  if (normalized.includes("inventory-api")) {
    return "inventory-api";
  }

  if (normalized.includes("auth-api")) {
    return "auth-api";
  }

  return "checkout-api";
}

slackApp.event("app_mention", async ({ event, client }) => {
  try {
    const incident = event.text.replace(/<@[^>]+>/g, "").trim();

    if (!incident) {
      await client.chat.postMessage({
        channel: event.channel,
        text: "Please provide an incident description after mentioning FlowGuard.",
      });

      return;
    }

    clearTimeline();

    lastIncident = incident;
    lastAnalysis = "";

    const service = detectService(incident);

    const metrics = getServiceMetrics(service);

    const deployments = getRecentDeployments(service);

    const currentVersion = deployments[0]?.version || "";

    const targetVersion = deployments[1]?.version || "";

    rollbackInProgress = false;

    updateIncidentState({
      active: true,
      incident,
      service,
      status: "investigating",

      analysis: "",
      rootCause: "",
      confidence: "",

      incidentVersion: currentVersion,

      currentVersion,

      targetVersion,

      errorRate: metrics?.error_rate || 0,

      latencyMs: metrics?.latency_ms || 0,

      incidentErrorRate: metrics?.error_rate || 0,

      incidentLatencyMs: metrics?.latency_ms || 0,

      recoveryErrorRate: 0,

      recoveryLatencyMs: 0,
    });

    addTimelineEvent("Incident detected", incident);

    await client.chat.postMessage({
      channel: event.channel,
      text: `🔎 FlowGuard is investigating ${service}...`,
    });

    console.log(`🔎 Starting AI investigation for ${service}...`);

    const analysis = await runIncidentCommander(incident);

    lastAnalysis = analysis;

    const rootCause = extractSection(analysis, "LIKELY ROOT CAUSE");

    const confidence = extractSection(analysis, "CONFIDENCE");

    addTimelineEvent(
      "AI investigation completed",
      "FlowGuard completed metrics, logs, deployment, and runbook analysis.",
    );

    updateIncidentState({
      status: "awaiting_approval",

      analysis,

      rootCause,

      confidence,

      currentVersion,

      targetVersion,
    });

    addTimelineEvent(
      "Human approval required",
      `FlowGuard recommends rollback from ${currentVersion} to ${targetVersion}.`,
    );

    const message = buildIncidentMessage(analysis);

    await client.chat.postMessage({
      channel: event.channel,
      ...message,
    });

    console.log(
      `⏳ Waiting for human approval: ${currentVersion} → ${targetVersion}`,
    );
  } catch (error) {
    console.error("Slack incident handling failed:", error);

    updateIncidentState({
      status: "failed",
    });

    addTimelineEvent(
      "Investigation failed",
      "FlowGuard encountered an error while investigating the incident.",
    );

    await client.chat.postMessage({
      channel: event.channel,
      text: "❌ FlowGuard encountered an error while investigating the incident.",
    });
  }
});

slackApp.action("approve_rollback", async ({ ack, body, client }) => {
  await ack();

  try {
    if (body.type !== "block_actions") {
      return;
    }

    const channelId = body.channel?.id;

    if (!channelId) {
      console.error("No Slack channel ID found.");

      return;
    }

    const action = body.actions[0];

    if (!("value" in action) || !action.value) {
      console.error("Rollback action does not contain a value.");

      return;
    }

    const data = JSON.parse(action.value) as {
      service: string;
      targetVersion: string;
    };

    if (!data.service || !data.targetVersion) {
      await client.chat.postMessage({
        channel: channelId,
        text: "❌ Invalid rollback approval request.",
      });

      return;
    }

    console.log("🚨 HUMAN APPROVAL RECEIVED FROM SLACK", data);

    if (rollbackInProgress) {
      await client.chat.postMessage({
        channel: channelId,
        text: "⏳ A rollback operation is already in progress.",
      });

      return;
    }

    const incidentState = getIncidentState();

    if (!incidentState.active) {
      await client.chat.postMessage({
        channel: channelId,
        text: "ℹ️ There is no active incident requiring remediation.",
      });

      return;
    }

    if (incidentState.service !== data.service) {
      await client.chat.postMessage({
        channel: channelId,
        text: "❌ This approval does not match the active incident.",
      });

      return;
    }

    if (incidentState.status === "recovered") {
      await client.chat.postMessage({
        channel: channelId,
        text: `🟢 ${data.service} is already recovered. No additional rollback is required.`,
      });

      return;
    }

    if (incidentState.status === "rolling_back") {
      await client.chat.postMessage({
        channel: channelId,
        text: `⏳ Rollback for ${data.service} is already in progress.`,
      });

      return;
    }

    if (incidentState.currentVersion === data.targetVersion) {
      await client.chat.postMessage({
        channel: channelId,
        text: `ℹ️ ${data.service} is already running ${data.targetVersion}. No rollback was executed.`,
      });

      return;
    }

    rollbackInProgress = true;

    const actualCurrentVersion =
      incidentState.currentVersion || incidentState.incidentVersion || "";

    console.log("Current running version:", actualCurrentVersion);

    updateIncidentState({
      status: "rolling_back",

      currentVersion: actualCurrentVersion,

      targetVersion: data.targetVersion,
    });

    addTimelineEvent(
      "Human approval received",
      `Approved rollback of ${data.service} from ${actualCurrentVersion} to ${data.targetVersion}.`,
    );

    await client.chat.postMessage({
      channel: channelId,
      text:
        `👤 *Human approval received*\n\n` +
        `🔄 Rolling back ${data.service}\n` +
        `\`${actualCurrentVersion}\` → \`${data.targetVersion}\`...`,
    });

    console.log("🔄 Executing approved rollback...");

    const rollbackResult = await rollbackService(
      data.service,
      data.targetVersion,
    );

    console.log("Rollback result:", rollbackResult);

    if (!rollbackResult.success) {
      updateIncidentState({
        status: "failed",
      });

      addTimelineEvent("Rollback failed", rollbackResult.message);

      await client.chat.postMessage({
        channel: channelId,
        text: `❌ *Rollback failed*\n\n${rollbackResult.message}`,
      });

      return;
    }

    updateIncidentState({
      status: "rolling_back",

      currentVersion: rollbackResult.new_version,

      targetVersion: rollbackResult.new_version,
    });

    addTimelineEvent(
      "Rollback executed",
      `${rollbackResult.service}: ${rollbackResult.previous_version} → ${rollbackResult.new_version}`,
    );

    await client.chat.postMessage({
      channel: channelId,
      text:
        `🔄 *ROLLBACK EXECUTED*\n\n` +
        `${rollbackResult.service}\n` +
        `\`${rollbackResult.previous_version}\` → \`${rollbackResult.new_version}\``,
    });

    console.log("🩺 Verifying service health...");

    await client.chat.postMessage({
      channel: channelId,
      text: `🩺 Rollback completed. FlowGuard is verifying ${data.service} health...`,
    });

    const healthResult = await verifyServiceHealth(data.service);

    console.log("Health verification:", healthResult);

    if (healthResult.healthy) {
      updateIncidentState({
        active: true,

        status: "recovered",

        currentVersion: healthResult.version,

        targetVersion: healthResult.version,

        errorRate: healthResult.error_rate,

        latencyMs: healthResult.latency_ms,

        recoveryErrorRate: healthResult.error_rate,

        recoveryLatencyMs: healthResult.latency_ms,
      });

      addTimelineEvent(
        "Incident recovered",
        `${data.service} recovered on ${healthResult.version}. Error rate: ${healthResult.error_rate}%, latency: ${healthResult.latency_ms}ms.`,
      );

      await client.chat.postMessage({
        channel: channelId,
        text:
          `🟢 *INCIDENT RECOVERED*\n\n` +
          `${data.service} is healthy on ${healthResult.version}.\n\n` +
          `Error rate: ${healthResult.error_rate}%\n` +
          `Latency: ${healthResult.latency_ms}ms`,
      });

      console.log("📝 Generating AI incident postmortem...");

      const postmortem = await generatePostmortem();

      addTimelineEvent(
        "AI postmortem generated",
        "FlowGuard generated an incident postmortem using the investigation and recovery timeline.",
      );

      await client.chat.postMessage({
        channel: channelId,
        text: `📝 *AI INCIDENT POSTMORTEM*\n\n${postmortem}`,
      });

      console.log("✅ Incident workflow completed successfully.");
    } else {
      updateIncidentState({
        status: "failed",

        errorRate: healthResult.error_rate,

        latencyMs: healthResult.latency_ms,
      });

      addTimelineEvent("Recovery verification failed", healthResult.message);

      await client.chat.postMessage({
        channel: channelId,
        text:
          `⚠️ *ROLLBACK COMPLETED, BUT SERVICE IS NOT HEALTHY*\n\n` +
          `${data.service} has not yet recovered.\n\n` +
          `${healthResult.message}`,
      });
    }
  } catch (error) {
    console.error("Rollback approval failed:", error);

    updateIncidentState({
      status: "failed",
    });

    addTimelineEvent(
      "Remediation failed",
      "FlowGuard could not complete the approved remediation.",
    );

    if (body.type === "block_actions" && body.channel?.id) {
      await client.chat.postMessage({
        channel: body.channel.id,
        text: "❌ FlowGuard could not complete the approved rollback.",
      });
    }
  } finally {
    rollbackInProgress = false;
  }
});

export async function startSlackBot() {
  console.log("🔌 Starting Slack Socket Mode...");

  await slackApp.start();

  console.log("⚡ FlowGuard Slack bot is running!");
}
