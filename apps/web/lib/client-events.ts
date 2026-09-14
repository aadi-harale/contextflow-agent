import type { RuntimeEvent } from './runtime';

const EVENTS_KEY = 'contextflowRuntimeEvents';
const RUN_KEY = 'contextflowRunId';

export function setCurrentRunId(runId: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(RUN_KEY, runId);
}

export function getCurrentRunId(): string {
  if (typeof window === 'undefined') return 'run_unavailable';
  const existing = window.localStorage.getItem(RUN_KEY);
  if (existing) return existing;
  const runId = `run_${Date.now()}`;
  window.localStorage.setItem(RUN_KEY, runId);
  return runId;
}

export function clearRuntimeEvents() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(EVENTS_KEY);
}

export function readRuntimeEvents(): RuntimeEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(EVENTS_KEY);
    return raw ? (JSON.parse(raw) as RuntimeEvent[]) : [];
  } catch {
    return [];
  }
}

export function appendRuntimeEvent(event: RuntimeEvent) {
  if (typeof window === 'undefined') return;
  const events = readRuntimeEvents();
  if (events.some((existing) => existing.eventId === event.eventId && existing.runId === event.runId)) return;
  const next = [...events, event].slice(-100);
  window.localStorage.setItem(EVENTS_KEY, JSON.stringify(next));
  try {
    const channel = new BroadcastChannel('contextflow-runtime');
    channel.postMessage(event);
    channel.close();
  } catch {
    // localStorage remains the durable demo read model when BroadcastChannel is unavailable.
  }
}

export function makeClientEvent(
  type: RuntimeEvent['type'],
  actor: RuntimeEvent['actor'],
  title: string,
  detail: string,
  data: RuntimeEvent['data'] = {},
): RuntimeEvent {
  const runId = getCurrentRunId();
  return {
    eventId: `client_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    runId,
    claimId: 'CF-1842',
    timestamp: new Date().toISOString(),
    type,
    actor,
    title,
    detail,
    data,
  };
}
