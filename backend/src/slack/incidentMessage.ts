function formatSlackAnalysis(analysis: string): string {
  if (!analysis) {
    return "FlowGuard could not generate an investigation summary.";
  }

  let text = analysis.trim();

  text = text.replace(/<br\s*\/?>/gi, "\n");

  text = text.replace(/```(?:markdown|md)?/gi, "");

  text = text.replace(/```/g, "");

  text = text.replace(/\|\s*---.*\|/g, "");

  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const output: string[] = [];

  let insideTable = false;

  for (const line of lines) {
    if (line.startsWith("|") && line.endsWith("|")) {
      const cells = line
        .split("|")
        .map((cell) => cell.trim())
        .filter(Boolean);

      if (cells.every((cell) => /^[-: ]+$/.test(cell))) {
        continue;
      }

      if (!insideTable) {
        insideTable = true;
      }

      if (cells.length >= 2) {
        output.push(`• *${cells[0]}:* ${cells.slice(1).join(" — ")}`);
      }

      continue;
    }

    insideTable = false;

    let cleanLine = line
      .replace(/^#{1,6}\s*/, "")
      .replace(/^\*\*(.*?)\*\*$/, "$1")
      .replace(/^__(.*?)__$/, "$1");

    if (/^[A-Z][A-Z ]+$/.test(cleanLine)) {
      output.push(`*${cleanLine}*`);
      continue;
    }

    cleanLine = cleanLine
      .replace(/\*\*(.*?)\*\*/g, "*$1*")
      .replace(/__(.*?)__/g, "*$1*");

    output.push(cleanLine);
  }

  return output.join("\n");
}

export function buildIncidentMessage(analysis: string) {
  const formattedAnalysis = formatSlackAnalysis(analysis);

  return {
    text: "🚨 FlowGuard Incident — checkout-api requires approval",

    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "🚨 FlowGuard Incident",
          emoji: true,
        },
      },

      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*checkout-api* is experiencing a critical production incident.",
        },
      },

      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: "*Severity*\n🔴 CRITICAL",
          },
          {
            type: "mrkdwn",
            text: "*Status*\n🟡 Awaiting Approval",
          },
          {
            type: "mrkdwn",
            text: "*Error Rate*\n`42.1%`",
          },
          {
            type: "mrkdwn",
            text: "*Latency*\n`8420 ms`",
          },
          {
            type: "mrkdwn",
            text: "*Incident Version*\n`v2.14.7`",
          },
          {
            type: "mrkdwn",
            text: "*Rollback Target*\n`v2.14.6`",
          },
        ],
      },

      {
        type: "divider",
      },

      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*🤖 AI Investigation*",
        },
      },

      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: formattedAnalysis,
        },
      },

      {
        type: "divider",
      },

      {
        type: "section",
        text: {
          type: "mrkdwn",
          text:
            "*Recommended remediation*\n" +
            "Rollback `checkout-api` from `v2.14.7` → `v2.14.6`.",
        },
      },

      {
        type: "section",
        text: {
          type: "mrkdwn",
          text:
            "⚠️ *Human approval required*\n" +
            "FlowGuard will not execute the rollback autonomously. " +
            "An authorized human must approve the action below.",
        },
      },

      {
        type: "actions",
        elements: [
          {
            type: "button",

            text: {
              type: "plain_text",
              text: "🚨 Approve Rollback",
              emoji: true,
            },

            style: "danger",

            action_id: "approve_rollback",

            value: JSON.stringify({
              service: "checkout-api",
              targetVersion: "v2.14.6",
            }),

            confirm: {
              title: {
                type: "plain_text",
                text: "Confirm rollback?",
                emoji: true,
              },

              text: {
                type: "mrkdwn",
                text:
                  "You are approving the rollback of `checkout-api` from `v2.14.7` to `v2.14.6`.\n\n" +
                  "This is a simulated remediation in the FlowGuard demo.",
              },

              confirm: {
                type: "plain_text",
                text: "Approve",
              },

              deny: {
                type: "plain_text",
                text: "Cancel",
              },
            },
          },
        ],
      },

      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: "FlowGuard • AI Incident Commander • Human-in-the-loop remediation",
          },
        ],
      },
    ],
  };
}
