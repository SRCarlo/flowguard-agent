export type IncidentStatus =
  | "idle"
  | "investigating"
  | "awaiting_approval"
  | "rolling_back"
  | "recovered"
  | "failed";

export interface IncidentState {
  active: boolean;

  incident: string;

  service: string;

  status: IncidentStatus;

  analysis: string;

  rootCause: string;

  confidence: string;

  /*
   * Version at the moment the incident was detected.
   *
   * Example:
   * v2.14.7
   */
  incidentVersion: string;

  /*
   * Current live version.
   *
   * Before rollback:
   * v2.14.7
   *
   * After rollback:
   * v2.14.6
   */
  currentVersion: string;

  /*
   * Safe rollback target.
   *
   * Example:
   * v2.14.6
   */
  targetVersion: string;

  errorRate: number;

  latencyMs: number;

  /*
   * Metrics observed when the incident started.
   *
   * These are preserved after recovery so the dashboard
   * can still show the impact of the incident.
   */
  incidentErrorRate: number;

  incidentLatencyMs: number;

  /*
   * Recovery metrics.
   */
  recoveryErrorRate: number;

  recoveryLatencyMs: number;

  lastUpdated: string;
}

const INITIAL_STATE: IncidentState = {
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

  lastUpdated: new Date().toISOString(),
};

const state: IncidentState = {
  ...INITIAL_STATE,
};

export function getIncidentState(): IncidentState {
  return {
    ...state,
  };
}

export function updateIncidentState(
  updates: Partial<IncidentState>,
): IncidentState {
  Object.assign(state, updates);

  state.lastUpdated = new Date().toISOString();

  return getIncidentState();
}

export function resetIncidentState(): void {
  Object.assign(state, {
    ...INITIAL_STATE,
    lastUpdated: new Date().toISOString(),
  });
}
