import { readFile } from "node:fs/promises";
import path from "node:path";

const RUNBOOKS: Record<string, string> = {
  "checkout-api": "checkout.md",
  "payment-api": "payments.md",
  "auth-api": "auth.md",
};

export async function getRunbook(service: string): Promise<string> {
  const filename = RUNBOOKS[service];

  if (!filename) {
    return `No runbook found for service: ${service}`;
  }

  const runbookPath = path.join(process.cwd(), "runbooks", filename);

  try {
    const content = await readFile(runbookPath, "utf-8");

    return content;
  } catch (error) {
    console.error("Failed to read runbook:", error);

    return `Unable to read runbook for service: ${service}`;
  }
}
