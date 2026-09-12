import type { ChatCompletionTool } from "openai/resources/chat/completions";

export const flowGuardTools: ChatCompletionTool[] = [
  {
    type: "function",

    function: {
      name: "get_service_metrics",

      description: "Get current production metrics for a service.",

      parameters: {
        type: "object",

        properties: {
          service: {
            type: "string",

            description: "The service name, for example checkout-api.",
          },
        },

        required: ["service"],

        additionalProperties: false,
      },
    },
  },

  {
    type: "function",

    function: {
      name: "search_logs",

      description:
        "Search production logs for a service. You can optionally filter by a search query and time range.",

      parameters: {
        type: "object",

        properties: {
          service: {
            type: "string",

            description: "The service name, for example checkout-api.",
          },

          query: {
            type: "string",

            description:
              "Optional text to search for in log messages, such as ERROR or NullPointerException.",
          },

          timestamp_start: {
            type: "string",

            description:
              "Optional ISO 8601 start timestamp for the log search.",
          },

          timestamp_end: {
            type: "string",

            description: "Optional ISO 8601 end timestamp for the log search.",
          },
        },

        required: ["service"],

        additionalProperties: false,
      },
    },
  },

  {
    type: "function",

    function: {
      name: "get_recent_deployments",

      description: "Get recent deployments for a service.",

      parameters: {
        type: "object",

        properties: {
          service: {
            type: "string",

            description: "The service name, for example checkout-api.",
          },
        },

        required: ["service"],

        additionalProperties: false,
      },
    },
  },

  {
    type: "function",

    function: {
      name: "get_runbook",

      description: "Get the operational runbook for a service.",

      parameters: {
        type: "object",

        properties: {
          service: {
            type: "string",

            description: "The service name, for example checkout-api.",
          },
        },

        required: ["service"],

        additionalProperties: false,
      },
    },
  },

  {
    type: "function",

    function: {
      name: "rollback_service",

      description:
        "Rollback a service to a specified version. This is a risky operation and must only be executed after explicit human approval.",

      parameters: {
        type: "object",

        properties: {
          service: {
            type: "string",

            description: "The service to rollback.",
          },

          targetVersion: {
            type: "string",

            description: "The version to rollback to.",
          },
        },

        required: ["service", "targetVersion"],

        additionalProperties: false,
      },
    },
  },

  {
    type: "function",

    function: {
      name: "verify_service_health",

      description:
        "Verify whether a service has recovered and meets its health criteria.",

      parameters: {
        type: "object",

        properties: {
          service: {
            type: "string",

            description: "The service whose health should be checked.",
          },
        },

        required: ["service"],

        additionalProperties: false,
      },
    },
  },
];
