import { readFile, writeFile } from "node:fs/promises";

import path from "node:path";

import { resetIncidentState } from "../services/incidentState.js";

import { clearTimeline } from "../services/incidentTimeline.js";

interface Service {
  name: string;
  version: string;
  status: string;
  team: string;
  environment: string;
}

const SERVICES_FILE = path.join(process.cwd(), "src", "data", "services.json");

const INITIAL_SERVICES: Service[] = [
  {
    name: "checkout-api",
    version: "v2.14.7",
    status: "degraded",
    team: "payments",
    environment: "production",
  },
  {
    name: "payment-api",
    version: "v4.8.2",
    status: "healthy",
    team: "payments",
    environment: "production",
  },
  {
    name: "inventory-api",
    version: "v3.2.1",
    status: "healthy",
    team: "inventory",
    environment: "production",
  },
  {
    name: "auth-api",
    version: "v5.1.4",
    status: "healthy",
    team: "identity",
    environment: "production",
  },
];

export async function resetDemoEnvironment() {
  /*
   * 1. Reset in-memory incident state
   */
  resetIncidentState();

  /*
   * 2. Clear incident timeline
   */
  clearTimeline();

  /*
   * 3. Restore service data
   *
   * This is important because the rollback tool
   * changes services.json from v2.14.7 to v2.14.6.
   */
  await writeFile(
    SERVICES_FILE,
    JSON.stringify(INITIAL_SERVICES, null, 2),
    "utf-8",
  );

  return {
    success: true,
    message: "FlowGuard demo environment reset successfully.",
    state: "idle",
    service: "checkout-api",
    version: "v2.14.7",
  };
}
