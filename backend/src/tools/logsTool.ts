import logs from "../data/logs.json" with { type: "json" };

export interface ServiceLog {
  timestamp: string;
  level: string;
  message: string;
  version: string;
}

export function searchLogs(
  service: string,
  query?: string,
  timestampStart?: string,
  timestampEnd?: string,
): ServiceLog[] {
  const data = logs as Record<string, ServiceLog[]>;

  const serviceLogs = data[service];

  if (!serviceLogs) {
    return [];
  }

  let results = serviceLogs;

  /**
   * Filter by search query
   */
  if (query) {
    const searchTerm = query.toLowerCase();

    results = results.filter((log) =>
      log.message.toLowerCase().includes(searchTerm),
    );
  }

  /**
   * Filter by start timestamp
   */
  if (timestampStart) {
    const start = new Date(timestampStart).getTime();

    results = results.filter(
      (log) => new Date(log.timestamp).getTime() >= start,
    );
  }

  /**
   * Filter by end timestamp
   */
  if (timestampEnd) {
    const end = new Date(timestampEnd).getTime();

    results = results.filter((log) => new Date(log.timestamp).getTime() <= end);
  }

  return results;
}
