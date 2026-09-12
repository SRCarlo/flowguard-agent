import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

interface Service {
  name: string;
  version: string;
  status: string;
  team: string;
  environment: string;
}

interface RollbackResult {
  success: boolean;
  action: string;
  service: string;
  previous_version: string;
  new_version: string;
  status: string;
  message: string;
  executed_at: string;
}

const SERVICES_FILE = path.join(process.cwd(), "src", "data", "services.json");

export async function rollbackService(
  service: string,
  targetVersion: string,
): Promise<RollbackResult> {
  const raw = await readFile(SERVICES_FILE, "utf-8");

  const services = JSON.parse(raw) as Service[];

  const serviceIndex = services.findIndex((item) => item.name === service);

  if (serviceIndex === -1) {
    return {
      success: false,
      action: "rollback",
      service,
      previous_version: "",
      new_version: "",
      status: "failed",
      message: `Service ${service} was not found.`,
      executed_at: new Date().toISOString(),
    };
  }

  const currentVersion = services[serviceIndex].version;

  if (currentVersion === targetVersion) {
    return {
      success: false,
      action: "rollback",
      service,
      previous_version: currentVersion,
      new_version: currentVersion,
      status: "rejected",
      message: `${service} is already running ${targetVersion}. No rollback was executed.`,
      executed_at: new Date().toISOString(),
    };
  }

  services[serviceIndex] = {
    ...services[serviceIndex],
    version: targetVersion,
    status: "recovering",
  };

  await writeFile(SERVICES_FILE, JSON.stringify(services, null, 2), "utf-8");

  return {
    success: true,
    action: "rollback",
    service,
    previous_version: currentVersion,
    new_version: targetVersion,
    status: "recovering",
    message: `${service} rolled back from ${currentVersion} to ${targetVersion}.`,
    executed_at: new Date().toISOString(),
  };
}
