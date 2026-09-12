import deployments from "../data/deployments.json" with { type: "json" };

export interface Deployment {
  version: string;
  deployed_at: string;
  deployed_by: string;
  status: string;
}

export function getRecentDeployments(service: string): Deployment[] {
  const data = deployments as Record<string, Deployment[]>;

  return data[service] || [];
}
