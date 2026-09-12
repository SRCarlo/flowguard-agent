import { aiClient, aiModel } from "./aiService.js";
import { getIncidentState } from "./incidentState.js";
import { getTimeline } from "./incidentTimeline.js";

export async function generatePostmortem(): Promise<string> {
  const state = getIncidentState();
  const timeline = getTimeline();

  const timelineText =
    timeline.length > 0
      ? timeline
          .map(
            (event) =>
              `${event.timestamp} - ${event.title}: ${event.description}`,
          )
          .join("\n")
      : "No timeline events available.";

  const prompt = `
You are FlowGuard's incident postmortem generator.

Create a concise professional production incident postmortem.

Use ONLY the information provided below.

Do not invent facts.
Do not expose chain-of-thought.

INCIDENT
${state.incident || "Not available"}

SERVICE
${state.service || "Not available"}

INCIDENT VERSION
${state.incidentVersion || "Not available"}

CURRENT VERSION
${state.currentVersion || "Not available"}

TARGET VERSION
${state.targetVersion || "Not available"}

INCIDENT ERROR RATE
${state.incidentErrorRate ?? "Not available"}%

INCIDENT LATENCY
${state.incidentLatencyMs ?? "Not available"}ms

RECOVERY ERROR RATE
${state.recoveryErrorRate ?? "Not available"}%

RECOVERY LATENCY
${state.recoveryLatencyMs ?? "Not available"}ms

AI ROOT CAUSE
${state.rootCause || "Not available"}

AI CONFIDENCE
${state.confidence || "Not available"}

TIMELINE
${timelineText}

Use exactly these sections:

INCIDENT POSTMORTEM

SUMMARY

IMPACT

ROOT CAUSE

EVIDENCE

REMEDIATION

RECOVERY

LESSONS

Keep the report concise and factual.
`;

  const response = await aiClient.chat.completions.create({
    model: aiModel,
    messages: [
      {
        role: "system",
        content:
          "You are FlowGuard's incident postmortem generator. Create concise evidence-based operational reports.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  return (
    response.choices[0]?.message?.content ||
    "No incident postmortem was generated."
  );
}

export function buildPostmortemMessage(postmortem: string) {
  return {
    text: "FlowGuard Incident Postmortem",
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "📝 FlowGuard Incident Postmortem",
        },
      },
      {
        type: "divider",
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: postmortem,
        },
      },
      {
        type: "divider",
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: "Generated automatically by FlowGuard after successful incident recovery.",
          },
        ],
      },
    ],
  };
}
