/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useCallback, useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

type IncidentStatus =
  | "idle"
  | "investigating"
  | "awaiting_approval"
  | "rolling_back"
  | "recovered"
  | "failed";

interface IncidentState {
  active: boolean;
  incident: string;
  service: string;
  status: IncidentStatus;
  analysis: string;
  rootCause: string;
  confidence: string;

  incidentVersion: string;
  currentVersion: string;
  targetVersion: string;

  errorRate: number;
  latencyMs: number;

  incidentErrorRate: number;
  incidentLatencyMs: number;

  recoveryErrorRate: number;
  recoveryLatencyMs: number;

  lastUpdated: string;
}

interface TimelineEvent {
  timestamp: string;
  event: string;
  details: string;
}

const EMPTY_STATE: IncidentState = {
  active: false,
  incident: "",
  service: "",
  status: "idle",
  analysis: "",
  rootCause: "",
  confidence: "",

  incidentVersion: "",
  currentVersion: "",
  targetVersion: "",

  errorRate: 0,
  latencyMs: 0,

  incidentErrorRate: 0,
  incidentLatencyMs: 0,

  recoveryErrorRate: 0,
  recoveryLatencyMs: 0,

  lastUpdated: "",
};

function cleanText(value: string): string {
  return value
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/`/g, "")
    .trim();
}

function extractSection(text: string, section: string): string {
  if (!text) {
    return "";
  }

  const escaped = section.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const regex = new RegExp(
    `(?:^|\\n)(?:#+\\s*)?${escaped}\\s*\\n([\\s\\S]*?)(?=\\n(?:#+\\s*)?[A-Z][A-Z ]+\\s*\\n|$)`,
    "i",
  );

  return regex.exec(text)?.[1]?.trim() || "";
}

function statusLabel(status: IncidentStatus): string {
  switch (status) {
    case "investigating":
      return "INVESTIGATING";

    case "awaiting_approval":
      return "AWAITING APPROVAL";

    case "rolling_back":
      return "ROLLING BACK";

    case "recovered":
      return "RECOVERED";

    case "failed":
      return "RECOVERY FAILED";

    default:
      return "IDLE";
  }
}

function statusClass(status: IncidentStatus): string {
  switch (status) {
    case "investigating":
      return "border-indigo-400/30 bg-indigo-400/10 text-indigo-300";

    case "awaiting_approval":
      return "border-amber-400/30 bg-amber-400/10 text-amber-300";

    case "rolling_back":
      return "border-orange-400/30 bg-orange-400/10 text-orange-300";

    case "recovered":
      return "border-emerald-400/30 bg-emerald-400/10 text-emerald-300";

    case "failed":
      return "border-red-400/30 bg-red-400/10 text-red-300";

    default:
      return "border-zinc-800 bg-zinc-900 text-zinc-500";
  }
}

function getSeverity(state: IncidentState) {
  /*
   * RECOVERED is a lifecycle status.
   * Never display LOW after recovery.
   */
  if (state.status === "recovered") {
    return {
      label: "RECOVERED",
      className: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
    };
  }

  if (state.status === "failed") {
    return {
      label: "FAILED",
      className: "border-red-400/30 bg-red-400/10 text-red-300",
    };
  }

  /*
   * During an active incident use the
   * original incident metrics.
   */
  const errorRate = state.incidentErrorRate || state.errorRate;

  const latency = state.incidentLatencyMs || state.latencyMs;

  if (errorRate >= 20 || latency >= 5000) {
    return {
      label: "CRITICAL",
      className: "border-red-400/30 bg-red-400/10 text-red-300",
    };
  }

  if (errorRate >= 10 || latency >= 2000) {
    return {
      label: "HIGH",
      className: "border-amber-400/30 bg-amber-400/10 text-amber-300",
    };
  }

  if (errorRate >= 5) {
    return {
      label: "MEDIUM",
      className: "border-yellow-400/30 bg-yellow-400/10 text-yellow-300",
    };
  }

  return {
    label: "LOW",
    className: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  };
}

function Icon({
  name,
  size = 20,
}: {
  name:
    | "shield"
    | "alert"
    | "activity"
    | "clock"
    | "server"
    | "brain"
    | "check"
    | "refresh"
    | "arrow"
    | "message"
    | "github"
    | "user";
  size?: number;
}) {
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (name) {
    case "shield":
      return (
        <svg {...props}>
          <path d="M12 3 20 6v5c0 5-3.3 8.8-8 10-4.7-1.2-8-5-8-10V6l8-3Z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );

    case "alert":
      return (
        <svg {...props}>
          <path d="m10.3 4.6-7.5 13A2 2 0 0 0 4.5 20h15a2 2 0 0 0 1.7-2.4l-7.5-13a2 2 0 0 0-3.4 0Z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
      );

    case "activity":
      return (
        <svg {...props}>
          <path d="M3 12h4l2-7 4 14 2-7h6" />
        </svg>
      );

    case "clock":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7v5l3 2" />
        </svg>
      );

    case "server":
      return (
        <svg {...props}>
          <rect x="4" y="4" width="16" height="6" rx="1" />
          <rect x="4" y="14" width="16" height="6" rx="1" />
          <path d="M8 7h.01M8 17h.01" />
        </svg>
      );

    case "brain":
      return (
        <svg {...props}>
          <path d="M9 4a3 3 0 0 0-3 3v1a3 3 0 0 0-2 3 3 3 0 0 0 2 3v1a3 3 0 0 0 3 3h2V4H9Z" />
          <path d="M15 4a3 3 0 0 1 3 3v1a3 3 0 0 1 2 3 3 3 0 0 1-2 3v1a3 3 0 0 1-3 3h-2V4h2Z" />
          <path d="M9 8h2M9 12h2M15 8h-2M15 12h-2" />
        </svg>
      );

    case "check":
      return (
        <svg {...props}>
          <path d="m5 12 4 4L19 6" />
        </svg>
      );

    case "refresh":
      return (
        <svg {...props}>
          <path d="M20 11a8 8 0 0 0-14.8-4L3 9" />
          <path d="M3 4v5h5" />
          <path d="M4 13a8 8 0 0 0 14.8 4l2.2-2" />
          <path d="M21 20v-5h-5" />
        </svg>
      );

    case "arrow":
      return (
        <svg {...props}>
          <path d="M5 12h13" />
          <path d="m13 6 6 6-6 6" />
        </svg>
      );

    case "message":
      return (
        <svg {...props}>
          <path d="M4 5h16v11H8l-4 4V5Z" />
          <path d="M8 9h8M8 12h5" />
        </svg>
      );

    case "github":
      return (
        <svg {...props} fill="currentColor" stroke="none">
          <path d="M12 .7A11.3 11.3 0 0 0 8.4 22.1c.57.1.78-.25.78-.55v-2.1c-3.18.7-3.85-1.35-3.85-1.35-.52-1.32-1.27-1.67-1.27-1.67-1.04-.7.08-.68.08-.68 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.67 1.25 3.32.96.1-.74.4-1.25.73-1.54-2.54-.29-5.21-1.27-5.21-5.65 0-1.25.45-2.27 1.18-3.07.73.8 1.18 1.82 1.18 3.07 0 4.39-2.67 5.35-5.22 5.64.41.36.78 1.08.78 2.18v3.23c0 .3.21.65.79.54A11.3 11.3 0 0 0 12 .7Z" />
        </svg>
      );

    case "user":
      return (
        <svg {...props}>
          <circle cx="12" cy="8" r="3.2" />
          <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
        </svg>
      );
  }
}

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={"rounded-2xl border border-zinc-800 bg-[#0c0e13] " + className}
    >
      {children}
    </section>
  );
}

function Metric({
  icon,
  label,
  value,
  unit,
}: {
  icon: Parameters<typeof Icon>[0]["name"];
  label: string;
  value: string | number;
  unit?: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-[#0c0e13] p-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-950 text-zinc-500">
        <Icon name={icon} size={17} />
      </div>

      <p className="mt-5 text-xs font-bold uppercase tracking-widest text-zinc-600">
        {label}
      </p>

      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-3xl font-black text-white">{value}</span>

        {unit && (
          <span className="text-xs font-semibold text-zinc-600">{unit}</span>
        )}
      </div>
    </div>
  );
}

function getAgentSteps(
  timeline: TimelineEvent[],
  status: IncidentStatus,
): Array<{
  label: string;
  description: string;
  state: "complete" | "active" | "pending" | "failed";
}> {
  const steps = [
    {
      label: "Metrics",
      description: "Service health and error metrics",
      event: "Metrics analyzed",
    },
    {
      label: "Deployments",
      description: "Recent version changes",
      event: "Deployments analyzed",
    },
    {
      label: "Logs",
      description: "Application error evidence",
      event: "Error logs analyzed",
    },
    {
      label: "Runbook",
      description: "Operational guidance",
      event: "Runbook analyzed",
    },
    {
      label: "AI Diagnosis",
      description: "Evidence correlation",
      event: "AI diagnosis completed",
    },
    {
      label: "Human Approval",
      description: "Safety checkpoint",
      event: "Human approval received",
    },
    {
      label: "Rollback",
      description: "Approved remediation",
      event: "Rollback executed",
    },
    {
      label: "Health Check",
      description: "Recovery verification",
      event: "Incident recovered",
    },
  ];

  const completedEvents = new Set(timeline.map((item) => item.event));

  const failed = timeline.some(
    (item) => item.event === "Recovery verification failed",
  );

  let activeIndex = -1;

  if (status === "investigating") {
    const firstIncomplete = steps.findIndex(
      (step) => !completedEvents.has(step.event),
    );

    activeIndex = firstIncomplete === -1 ? 4 : firstIncomplete;
  } else if (status === "awaiting_approval") {
    activeIndex = 5;
  } else if (status === "rolling_back") {
    activeIndex = 6;
  } else if (status === "failed") {
    activeIndex = 7;
  }

  return steps.map((step, index) => {
    const isComplete = completedEvents.has(step.event);

    let stepState: "complete" | "active" | "pending" | "failed" = "pending";

    if (failed && index === 7) {
      stepState = "failed";
    } else if (isComplete) {
      stepState = "complete";
    } else if (index === activeIndex) {
      stepState = "active";
    }

    return {
      label: step.label,
      description: step.description,
      state: stepState,
    };
  });
}

export default function Home() {
  const [state, setState] = useState<IncidentState>(EMPTY_STATE);

  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);

  const [connected, setConnected] = useState(true);

  const [question, setQuestion] = useState("");

  const [answer, setAnswer] = useState("");

  const [loading, setLoading] = useState(false);

  const [resetting, setResetting] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      const [stateResponse, timelineResponse] = await Promise.all([
        fetch(`${API_URL}/api/incidents/state`, {
          cache: "no-store",
        }),

        fetch(`${API_URL}/api/incidents/timeline`, {
          cache: "no-store",
        }),
      ]);

      if (!stateResponse.ok) {
        throw new Error(`State API: ${stateResponse.status}`);
      }

      if (!timelineResponse.ok) {
        throw new Error(`Timeline API: ${timelineResponse.status}`);
      }

      const stateData = (await stateResponse.json()) as IncidentState;

      const timelineData = await timelineResponse.json();

      let timelineArray: TimelineEvent[] = [];

      if (Array.isArray(timelineData)) {
        timelineArray = timelineData;
      } else if (Array.isArray(timelineData?.timeline)) {
        timelineArray = timelineData.timeline;
      }

      setState({
        ...EMPTY_STATE,
        ...stateData,
      });

      setTimeline(timelineArray);

      setConnected(true);
    } catch (error) {
      console.error("Dashboard error:", error);

      setConnected(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();

    const interval = window.setInterval(loadDashboard, 2000);

    return () => window.clearInterval(interval);
  }, [loadDashboard]);

  async function resetDemo() {
    if (resetting) {
      return;
    }

    setResetting(true);

    try {
      const response = await fetch(`${API_URL}/api/demo/reset`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Reset API: ${response.status}`);
      }

      setState(EMPTY_STATE);

      setTimeline([]);

      setAnswer("");

      setQuestion("");

      await loadDashboard();
    } catch (error) {
      console.error("Reset failed:", error);

      window.alert(
        "Reset failed. Make sure the backend is running on port 3000.",
      );
    } finally {
      setResetting(false);
    }
  }

  async function triggerDemo() {
    if (loading || resetting) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/demo/trigger`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error || `Demo trigger API: ${response.status}`,
        );
      }

      setAnswer("");
      await loadDashboard();
    } catch (error) {
      console.error("Demo trigger failed:", error);

      window.alert(
        "Demo trigger failed. Make sure the backend is running on port 3000.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function askFlowGuard() {
    const text = question.trim();

    if (!text || loading) {
      return;
    }

    setLoading(true);
    setAnswer("");

    try {
      const response = await fetch(`${API_URL}/api/agent/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Agent request failed.");
      }

      setAnswer(
        typeof data.answer === "string" ? data.answer : "No answer generated.",
      );
    } catch (error) {
      console.error("Ask FlowGuard failed:", error);

      setAnswer(
        "FlowGuard could not process the request. Check the backend and AI service.",
      );
    } finally {
      setLoading(false);
    }
  }

  const severity = getSeverity(state);

  const rootCause =
    cleanText(
      state.rootCause || extractSection(state.analysis, "LIKELY ROOT CAUSE"),
    ) ||
    (state.status === "investigating"
      ? "FlowGuard is investigating the incident..."
      : state.active
        ? "Diagnosis is being finalized from the collected evidence."
        : "No active incident.");

  const confidence =
    cleanText(
      state.confidence || extractSection(state.analysis, "CONFIDENCE"),
    ) || (state.status === "investigating" ? "Analyzing..." : "—");

  const evidence =
    cleanText(extractSection(state.analysis, "EVIDENCE")) ||
    (state.active
      ? "FlowGuard is collecting evidence from metrics, deployments, logs, and the runbook."
      : "No incident evidence.");

  const recommendation =
    cleanText(extractSection(state.analysis, "RECOMMENDED ACTION")) ||
    (state.active
      ? "Determining the safest remediation..."
      : "No remediation required.");

  const isRecovered = state.status === "recovered";

  const agentSteps = getAgentSteps(timeline, state.status);

  return (
    <main className="min-h-screen bg-[#07080c] text-white">
      {/* HEADER */}

      <header className="sticky top-0 z-30 border-b border-zinc-900 bg-[#07080c]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-indigo-400/20 bg-indigo-400/10 text-indigo-300">
              <Icon name="shield" size={22} />
            </div>

            <div>
              <h1 className="text-xl font-black">FlowGuard</h1>

              <p className="text-xs text-zinc-600">AI Incident Commander</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={
                "hidden rounded-full border px-3 py-2 text-xs font-bold sm:block " +
                (connected
                  ? "border-emerald-400/20 bg-emerald-400/5 text-emerald-300"
                  : "border-red-400/20 bg-red-400/5 text-red-300")
              }
            >
              ● {connected ? "SYSTEM ONLINE" : "BACKEND OFFLINE"}
            </span>

            <span className="hidden text-[11px] font-semibold text-zinc-700 xl:block">
              {state.lastUpdated
                ? `Updated ${new Date(state.lastUpdated).toLocaleTimeString()}`
                : "Waiting for incident data"}
            </span>

            <button
              type="button"
              onClick={triggerDemo}
              disabled={loading || resetting}
              className="flex items-center gap-2 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-2.5 text-xs font-black text-red-300 transition hover:border-red-400/30 hover:bg-red-400/15 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Icon name="alert" size={15} />

              {loading ? "Triggering..." : "Trigger demo"}
            </button>

            <button
              type="button"
              onClick={resetDemo}
              disabled={resetting || loading}
              className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-xs font-bold text-zinc-400 transition hover:border-zinc-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Icon name="refresh" size={15} />

              {resetting ? "Resetting..." : "Reset demo"}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-5 px-5 py-7 sm:px-8">
        {/* HERO */}

        <Card className="p-7 sm:p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-indigo-400">
                <Icon name="activity" size={14} />
                Incident Command Center
              </div>

              <h2 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">
                {state.active
                  ? state.service || "Production incident"
                  : "Everything under control."}
              </h2>

              <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-500">
                {state.active
                  ? "FlowGuard is investigating the incident, coordinating remediation, and verifying recovery."
                  : "From alert to resolution — without leaving Slack."}
              </p>
            </div>

            <div className="flex flex-col items-start gap-3 lg:items-end">
              <div className="flex flex-wrap gap-2">
                <span
                  className={
                    "rounded-full border px-4 py-2 text-xs font-black " +
                    severity.className
                  }
                >
                  {severity.label}
                </span>

                <span
                  className={
                    "rounded-full border px-4 py-2 text-xs font-black " +
                    statusClass(state.status)
                  }
                >
                  {statusLabel(state.status)}
                </span>
              </div>

              {!state.active && (
                <button
                  type="button"
                  onClick={triggerDemo}
                  disabled={loading || resetting}
                  className="flex items-center gap-2 rounded-xl bg-red-500 px-5 py-3 text-xs font-black text-white shadow-lg shadow-red-500/10 transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Icon name="alert" size={16} />
                  {loading ? "Triggering incident..." : "Trigger Demo Incident"}
                </button>
              )}
            </div>
          </div>
        </Card>

        {/* METRICS */}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric
            icon="activity"
            label={isRecovered ? "Recovery error rate" : "Error rate"}
            value={
              isRecovered
                ? state.recoveryErrorRate
                : state.incidentErrorRate || state.errorRate
            }
            unit="%"
          />

          <Metric
            icon="clock"
            label={isRecovered ? "Recovery latency" : "Latency"}
            value={
              isRecovered
                ? state.recoveryLatencyMs
                : state.incidentLatencyMs || state.latencyMs
            }
            unit="ms"
          />

          <Metric
            icon="server"
            label="Current version"
            value={state.currentVersion || "—"}
          />

          <Metric
            icon="alert"
            label="Incident severity"
            value={severity.label}
          />
        </div>

        {/* INCIDENT */}

        <Card className="p-6 sm:p-7">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-400/10 text-red-300">
              <Icon name="alert" size={18} />
            </div>

            <div>
              <h2 className="text-xl font-bold">Current Incident</h2>

              <p className="text-sm text-zinc-600">
                Production event managed by FlowGuard.
              </p>
            </div>
          </div>

          {state.active ? (
            <div className="rounded-xl border border-red-400/10 bg-red-400/[0.025] p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-red-400">
                Production alert
              </p>

              <p className="mt-3 text-base leading-7 text-zinc-300">
                {state.incident}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center">
              <Icon name="check" size={24} />

              <p className="mt-3 font-bold text-zinc-500">No active incident</p>
              <p className="mt-2 text-xs text-zinc-700">
                Use “Trigger Demo Incident” above to start the FlowGuard workflow.
              </p>
            </div>
          )}
        </Card>

        {/* AI */}

        <Card className="p-6 sm:p-7">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-400/10 text-indigo-300">
              <Icon name="brain" size={18} />
            </div>

            <div>
              <h2 className="text-xl font-bold">AI Diagnosis</h2>

              <p className="text-sm text-zinc-600">
                Evidence-based incident analysis.
              </p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_250px]">
            <div className="rounded-xl border border-indigo-400/15 bg-indigo-400/[0.025] p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-600">
                Likely root cause
              </p>

              <p className="mt-3 text-xl font-black leading-8 text-white">
                {rootCause}
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-600">
                Confidence
              </p>

              <p className="mt-3 text-xl font-black text-indigo-300">
                {confidence}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-600">
                Evidence
              </p>

              <p className="mt-4 whitespace-pre-line text-sm leading-7 text-zinc-400">
                {evidence}
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-600">
                Recommended action
              </p>

              <p className="mt-4 whitespace-pre-line text-sm leading-7 text-zinc-400">
                {recommendation}
              </p>
            </div>
          </div>
        </Card>

        {/* LIVE AGENT ACTIVITY */}

        <Card className="p-6 sm:p-7">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-400/10 text-indigo-300">
                <Icon name="brain" size={18} />
              </div>

              <div>
                <h2 className="text-xl font-bold">Live Agent Activity</h2>

                <p className="text-sm text-zinc-600">
                  FlowGuard execution state updates automatically.
                </p>
              </div>
            </div>

            <span
              className={
                "w-fit rounded-full border px-3 py-2 text-[11px] font-black uppercase tracking-wider " +
                (state.status === "failed"
                  ? "border-red-400/20 bg-red-400/10 text-red-300"
                  : state.status === "recovered"
                    ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                    : "border-indigo-400/20 bg-indigo-400/10 text-indigo-300")
              }
            >
              {statusLabel(state.status)}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {agentSteps.map((step) => {
              const isComplete = step.state === "complete";

              const isActive = step.state === "active";

              const isFailed = step.state === "failed";

              return (
                <div
                  key={step.label}
                  className={
                    "rounded-xl border p-4 transition " +
                    (isFailed
                      ? "border-red-400/20 bg-red-400/[0.035]"
                      : isComplete
                        ? "border-emerald-400/15 bg-emerald-400/[0.025]"
                        : isActive
                          ? "border-indigo-400/20 bg-indigo-400/[0.035]"
                          : "border-zinc-800 bg-zinc-950")
                  }
                >
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className={
                        "flex h-8 w-8 items-center justify-center rounded-lg text-xs font-black " +
                        (isFailed
                          ? "bg-red-400/10 text-red-300"
                          : isComplete
                            ? "bg-emerald-400/10 text-emerald-300"
                            : isActive
                              ? "bg-indigo-400/10 text-indigo-300"
                              : "bg-zinc-900 text-zinc-600")
                      }
                    >
                      {isComplete ? (
                        <Icon name="check" size={15} />
                      ) : isFailed ? (
                        "!"
                      ) : (
                        agentSteps.indexOf(step) + 1
                      )}
                    </span>

                    <span
                      className={
                        "text-[10px] font-black uppercase tracking-widest " +
                        (isFailed
                          ? "text-red-300"
                          : isComplete
                            ? "text-emerald-300"
                            : isActive
                              ? "text-indigo-300"
                              : "text-zinc-700")
                      }
                    >
                      {isFailed
                        ? "Failed"
                        : isComplete
                          ? "Complete"
                          : isActive
                            ? "Active"
                            : "Pending"}
                    </span>
                  </div>

                  <p className="mt-4 text-sm font-bold text-zinc-300">
                    {step.label}
                  </p>

                  <p className="mt-1 text-xs leading-5 text-zinc-600">
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>

        {/* FLOW */}

        <Card className="p-6 sm:p-7">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-950 text-zinc-400">
              <Icon name="activity" size={18} />
            </div>

            <div>
              <h2 className="text-xl font-bold">Incident Flow</h2>

              <p className="text-sm text-zinc-600">
                Detection → diagnosis → approval → recovery.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto pb-2">
            <div className="flex min-w-[900px] items-center">
              {[
                "Metrics",
                "Deployments",
                "Logs",
                "Runbook",
                "AI Diagnosis",
                "Approval",
                "Rollback",
                "Health Check",
              ].map((step, index) => {
                let done = false;

                if (state.status === "investigating") {
                  done = index < 1;
                }

                if (state.status === "awaiting_approval") {
                  done = index < 5;
                }

                if (state.status === "rolling_back") {
                  done = index < 6;
                }

                if (state.status === "recovered") {
                  done = index < 8;
                }

                if (state.status === "failed") {
                  done = index < 7;
                }

                const active =
                  !done &&
                  index ===
                    (state.status === "investigating"
                      ? 1
                      : state.status === "awaiting_approval"
                        ? 5
                        : state.status === "rolling_back"
                          ? 6
                          : state.status === "failed"
                            ? 7
                            : 0);

                return (
                  <div key={step} className="flex flex-1 items-center">
                    <div className="flex min-w-[105px] flex-col items-center">
                      <div
                        className={
                          "flex h-11 w-11 items-center justify-center rounded-full border text-xs font-black " +
                          (done
                            ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                            : active
                              ? "border-indigo-400/40 bg-indigo-400/10 text-indigo-300"
                              : "border-zinc-800 bg-zinc-950 text-zinc-600")
                        }
                      >
                        {done ? <Icon name="check" size={17} /> : index + 1}
                      </div>

                      <span
                        className={
                          "mt-3 text-center text-xs font-bold " +
                          (done
                            ? "text-emerald-300"
                            : active
                              ? "text-indigo-300"
                              : "text-zinc-600")
                        }
                      >
                        {step}
                      </span>
                    </div>

                    {index < 7 && (
                      <div
                        className={
                          "h-px flex-1 " +
                          (done ? "bg-emerald-400/30" : "bg-zinc-800")
                        }
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-7 rounded-xl border border-amber-400/15 bg-amber-400/[0.025] p-5">
            <div className="flex gap-3">
              <div className="text-amber-300">
                <Icon name="user" size={19} />
              </div>

              <div>
                <p className="text-sm font-bold text-amber-300">
                  Human approval required
                </p>

                <p className="mt-1 text-sm leading-6 text-zinc-600">
                  FlowGuard recommends the rollback. A human approves it in
                  Slack before remediation executes.
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* REMEDIATION */}

        {state.active && (
          <Card className="p-6 sm:p-7">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-400/10 text-orange-300">
                <Icon name="refresh" size={18} />
              </div>

              <div>
                <h2 className="text-xl font-bold">Remediation</h2>

                <p className="text-sm text-zinc-600">
                  Deployment rollback selected by FlowGuard.
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
              <div className="rounded-xl border border-red-400/15 bg-red-400/[0.025] p-6">
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-600">
                  Incident version
                </p>

                <p className="mt-2 text-3xl font-black text-red-300">
                  {state.incidentVersion || state.currentVersion || "—"}
                </p>
              </div>

              <div className="flex justify-center text-zinc-600">
                <Icon name="arrow" size={25} />
              </div>

              <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/[0.025] p-6">
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-600">
                  Rollback target
                </p>

                <p className="mt-2 text-3xl font-black text-emerald-300">
                  {state.targetVersion || "—"}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 p-5">
              <p className="text-sm font-bold text-zinc-300">
                {state.status === "awaiting_approval"
                  ? "⏳ Approval requested in Slack"
                  : state.status === "rolling_back"
                    ? "🔄 Rollback in progress"
                    : state.status === "recovered"
                      ? "✓ Rollback completed successfully"
                      : "Waiting for remediation decision"}
              </p>

              <p className="mt-1 text-sm leading-6 text-zinc-600">
                {state.status === "awaiting_approval"
                  ? "Open the FlowGuard message in Slack and approve the rollback."
                  : state.status === "rolling_back"
                    ? "The approved remediation is being executed and health will be verified."
                    : state.status === "recovered"
                      ? "The service recovered and passed its health check."
                      : "FlowGuard is coordinating the remediation."}
              </p>
            </div>
          </Card>
        )}

        {/* RECOVERY */}

        {isRecovered && (
          <Card className="border-emerald-400/20 bg-emerald-400/[0.025] p-6 sm:p-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
                  <Icon name="check" size={24} />
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                    Recovery verified
                  </p>

                  <h2 className="mt-1 text-2xl font-black">
                    Incident recovered
                  </h2>
                </div>
              </div>

              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-black text-emerald-300">
                HEALTH CHECK PASSED
              </span>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <Metric
                icon="server"
                label="Recovered version"
                value={state.currentVersion || "—"}
              />

              <Metric
                icon="activity"
                label="Error rate"
                value={state.recoveryErrorRate}
                unit="%"
              />

              <Metric
                icon="clock"
                label="Latency"
                value={state.recoveryLatencyMs}
                unit="ms"
              />
            </div>
          </Card>
        )}

        {/* TIMELINE */}

        <Card className="p-6 sm:p-7">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-950 text-zinc-400">
              <Icon name="clock" size={18} />
            </div>

            <div>
              <h2 className="text-xl font-bold">Incident Timeline</h2>

              <p className="text-sm text-zinc-600">
                Live events captured by FlowGuard.
              </p>
            </div>
          </div>

          {timeline.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-800 p-9 text-center">
              <Icon name="clock" size={22} />

              <p className="mt-3 text-sm font-bold text-zinc-500">
                No incident events yet
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {timeline.map((item, index) => (
                <div
                  key={`${item.timestamp}-${index}`}
                  className="flex gap-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-300">
                    <Icon name="check" size={16} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm font-bold text-zinc-300">
                        {item.event}
                      </p>

                      <span className="font-mono text-xs text-zinc-700">
                        {item.timestamp
                          ? new Date(item.timestamp).toLocaleTimeString()
                          : "--:--"}
                      </span>
                    </div>

                    {item.details && (
                      <p className="mt-1 text-sm leading-6 text-zinc-600">
                        {item.details}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* ASK FLOWGUARD */}

        <Card className="border-indigo-400/15 bg-indigo-400/[0.018] p-6 sm:p-7">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-400/10 text-indigo-300">
              <Icon name="message" size={18} />
            </div>

            <div>
              <h2 className="text-xl font-bold">Ask FlowGuard</h2>

              <p className="text-sm text-zinc-600">
                Ask the AI incident commander about the situation.
              </p>
            </div>
          </div>

          <div className="mb-4">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-zinc-700">
              Quick questions
            </p>

            <div className="flex flex-wrap gap-2">
              {[
                "Why is checkout-api failing?",
                "What changed recently?",
                "Is rollback safe?",
                "What is the current recovery status?",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setQuestion(suggestion)}
                  disabled={loading}
                  className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-semibold text-zinc-500 transition hover:border-indigo-400/30 hover:bg-indigo-400/[0.04] hover:text-indigo-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row">
            <input
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();

                  askFlowGuard();
                }
              }}
              placeholder="Why is checkout-api failing?"
              className="h-14 flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-5 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-indigo-400/40"
            />

            <button
              type="button"
              onClick={askFlowGuard}
              disabled={loading || !question.trim()}
              className="flex h-14 items-center justify-center gap-2 rounded-xl bg-indigo-500 px-7 text-sm font-black hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Icon name="brain" size={17} />

              {loading ? "Analyzing..." : "Ask FlowGuard"}
            </button>
          </div>

          {answer && (
            <div className="mt-4 rounded-xl border border-indigo-400/10 bg-zinc-950 p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-indigo-400">
                FlowGuard response
              </p>

              <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-zinc-400">
                {answer}
              </p>
            </div>
          )}
        </Card>

        {/* FOOTER */}

        <footer className="border-t border-zinc-900 py-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div>
              <p className="text-sm font-bold text-zinc-400">FlowGuard</p>

              <p className="mt-1 text-xs text-zinc-700">
                From alert to resolution — without leaving Slack.
              </p>
            </div>

            <a
              href="https://github.com/SRCarlo"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-bold text-zinc-500 hover:text-white"
            >
              <Icon name="github" size={15} />
              SRCarlo
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}
