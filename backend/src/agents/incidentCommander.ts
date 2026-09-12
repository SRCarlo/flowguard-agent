import { aiClient, aiModel, provider } from "../services/aiService.js";

import { getServiceMetrics } from "../tools/metricsTool.js";

import { searchLogs } from "../tools/logsTool.js";

import { getRecentDeployments } from "../tools/deploymentsTool.js";

import { getRunbook } from "../tools/runbookTool.js";

import { flowGuardTools } from "./flowGuardTools.js";

import { addTimelineEvent } from "../services/incidentTimeline.js";

/* =========================================================
   SYSTEM PROMPT
   ========================================================= */

const SYSTEM_PROMPT = `
You are FlowGuard, an AI Incident Commander.

Your job is to investigate software production incidents.

You have access to operational tools.

IMPORTANT RULES:

1. Do not invent operational data.

2. Use tools when you need production evidence.

3. Investigate before making a diagnosis.

4. Compare multiple pieces of evidence.

5. Do not claim an action was executed unless a tool
   actually executed it.

6. Do not perform risky remediation actions.

7. Recommend remediation only after investigation.

8. Clearly distinguish evidence from conclusions.

9. Never expose private chain-of-thought.

10. Provide concise evidence-based conclusions.

11. Treat the runbook as operational guidance.

12. Do not repeatedly search for unrelated log terms.

13. Prefer the ERROR log search first.

14. Read the runbook before making your final recommendation.

15. If recent deployment strongly correlates with the
    incident, recommend rollback only as a recommendation.

16. Human approval is required before risky remediation.

INVESTIGATION ORDER:

1. Get service metrics.
2. Get recent deployments.
3. Search logs using query "ERROR".
4. Read the service runbook.
5. Correlate the evidence.
6. Only perform additional log searches if the existing
   evidence is insufficient.
7. Produce the final diagnosis.

For the final response use exactly:

INCIDENT

AFFECTED SERVICE

EVIDENCE

LIKELY ROOT CAUSE

CONFIDENCE

RECOMMENDED ACTION
`;

/* =========================================================
   HELPER — NORMALIZE GROQ TOOL NAMES
   ========================================================= */

/**
 * Some Groq model responses can occasionally contain
 * additional control tokens after a tool name.
 *
 * Example:
 *
 * get_runbook<|channel|>commentary
 *
 * We only need the actual tool name.
 */
function normalizeToolName(toolName: string): string {
  return toolName.split("<|")[0].trim();
}

/* =========================================================
   HELPER — ADD TOOL TIMELINE EVENT
   ========================================================= */

function addToolTimelineEvent(toolName: string, service: string): void {
  switch (toolName) {
    case "get_service_metrics":
      addTimelineEvent(
        "Metrics analyzed",
        `FlowGuard analyzed production metrics for ${service}.`,
      );

      break;

    case "get_recent_deployments":
      addTimelineEvent(
        "Deployments analyzed",
        `FlowGuard checked recent deployments for ${service}.`,
      );

      break;

    case "search_logs":
      addTimelineEvent(
        "Error logs analyzed",
        `FlowGuard searched ${service} logs for incident evidence.`,
      );

      break;

    case "get_runbook":
      addTimelineEvent(
        "Runbook analyzed",
        `FlowGuard reviewed the operational runbook for ${service}.`,
      );

      break;

    default:
      break;
  }
}

/* =========================================================
   FLOWGUARD INCIDENT COMMANDER
   ========================================================= */

/**
 * Run FlowGuard investigation.
 *
 * The AI can use operational investigation tools.
 *
 * Risky remediation tools are intentionally blocked here.
 * Human approval in Slack controls rollback execution.
 */
export async function runIncidentCommander(incident: string): Promise<string> {
  const messages: any[] = [
    {
      role: "system",
      content: SYSTEM_PROMPT,
    },

    {
      role: "user",
      content: incident,
    },
  ];

  /* =======================================================
     AI TOOL-CALLING LOOP
     ======================================================= */

  for (let turn = 0; turn < 8; turn++) {
    const response = await aiClient.chat.completions.create({
      model: aiModel,

      messages,

      tools: flowGuardTools,

      tool_choice: "auto",
    });

    const message = response.choices[0]?.message;

    if (!message) {
      return "No analysis generated.";
    }

    /*
     * Save the assistant message so that subsequent
     * tool results remain part of the conversation.
     */

    messages.push(message);

    /* =====================================================
       FINAL AI RESPONSE
       ===================================================== */

    if (!message.tool_calls?.length) {
      console.log(`AI Provider: ${provider}`);

      console.log(`AI Model: ${aiModel}`);

      addTimelineEvent(
        "AI diagnosis completed",
        "FlowGuard completed evidence correlation and generated the incident diagnosis.",
      );

      return message.content || "No analysis generated.";
    }

    /* =====================================================
       PROCESS TOOL CALLS
       ===================================================== */

    for (const toolCall of message.tool_calls) {
      /*
       * Ignore non-function tools.
       */

      if (toolCall.type !== "function") {
        continue;
      }

      /* ===================================================
         NORMALIZE TOOL NAME
         =================================================== */

      const toolName = normalizeToolName(toolCall.function.name);

      /* ===================================================
         PARSE TOOL ARGUMENTS
         =================================================== */

      let args: any = {};

      try {
        args = JSON.parse(toolCall.function.arguments);
      } catch (error) {
        console.error("Failed to parse tool arguments:", error);

        messages.push({
          role: "tool",

          tool_call_id: toolCall.id,

          content: JSON.stringify({
            error: "Invalid tool arguments.",
          }),
        });

        continue;
      }

      console.log(`🔧 Tool requested: ${toolName}`, args);

      /* ===================================================
         DETERMINE SERVICE
         =================================================== */

      const service =
        typeof args.service === "string" ? args.service : "unknown";

      /* ===================================================
         RECORD REAL TOOL EXECUTION
         =================================================== */

      addToolTimelineEvent(toolName, service);

      /* ===================================================
         EXECUTE INVESTIGATION TOOL
         =================================================== */

      let result: unknown;

      switch (toolName) {
        /* -------------------------------------------------
           METRICS
           ------------------------------------------------- */

        case "get_service_metrics":
          result = getServiceMetrics(args.service);

          break;

        /* -------------------------------------------------
           LOGS
           ------------------------------------------------- */

        case "search_logs":
          result = searchLogs(
            args.service,
            args.query,
            args.timestamp_start,
            args.timestamp_end,
          );

          break;

        /* -------------------------------------------------
           DEPLOYMENTS
           ------------------------------------------------- */

        case "get_recent_deployments":
          result = getRecentDeployments(args.service);

          break;

        /* -------------------------------------------------
           RUNBOOK
           ------------------------------------------------- */

        case "get_runbook":
          result = await getRunbook(args.service);

          break;

        /* -------------------------------------------------
           ROLLBACK
           ------------------------------------------------- */

        case "rollback_service":
          /*
           * IMPORTANT:
           *
           * FlowGuard must NOT autonomously execute
           * risky remediation.
           *
           * Human approval in Slack is required.
           */

          result = {
            error:
              "Rollback requires explicit human approval in Slack. Do not execute this tool autonomously.",
          };

          break;

        /* -------------------------------------------------
           HEALTH VERIFICATION
           ------------------------------------------------- */

        case "verify_service_health":
          /*
           * Health verification is performed after
           * human-approved remediation.
           */

          result = {
            error:
              "Health verification is performed after human-approved remediation.",
          };

          break;

        /* -------------------------------------------------
           UNKNOWN TOOL
           ------------------------------------------------- */

        default:
          result = {
            error: `Unknown tool: ${toolName}`,
          };

          break;
      }

      /* ===================================================
         RETURN TOOL RESULT TO AI
         =================================================== */

      messages.push({
        role: "tool",

        tool_call_id: toolCall.id,

        content: JSON.stringify(result),
      });
    }
  }

  /* =======================================================
     MAXIMUM TOOL-CALL LIMIT
     ======================================================= */

  addTimelineEvent(
    "Investigation limit reached",
    "FlowGuard reached the maximum number of investigation turns before generating a final diagnosis.",
  );

  return "Investigation exceeded the maximum number of tool calls.";
}
