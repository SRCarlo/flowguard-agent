export interface TimelineEvent {
  [x: string]: any;
  timestamp: string;
  event: string;
  details: string;
}

const timeline: TimelineEvent[] = [];

export function addTimelineEvent(
  event: string,
  details: string,
): void {
  timeline.push({
    timestamp:
      new Date().toISOString(),

    event,

    details,
  });
}

export function getTimeline(): TimelineEvent[] {
  return timeline.map((item) => ({
    ...item,
  }));
}

export function clearTimeline(): void {
  timeline.length = 0;
}