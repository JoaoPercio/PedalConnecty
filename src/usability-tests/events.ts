import { isUsabilityTestsEnabled } from "./config";
import type { UsabilityEvent } from "./types";

type Listener = (event: UsabilityEvent) => void;

const STORAGE_KEY = "pc_usability_event_queue";
const listeners = new Set<Listener>();

function readStoredQueue(): UsabilityEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as UsabilityEvent[]) : [];
  } catch {
    return [];
  }
}

function writeStoredQueue(events: UsabilityEvent[]): void {
  if (typeof window === "undefined") return;
  try {
    if (events.length === 0) {
      sessionStorage.removeItem(STORAGE_KEY);
      return;
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch {
    // ignore quota / private mode
  }
}

export function subscribeUsabilityEvents(listener: Listener): () => void {
  listeners.add(listener);
  const pending = readStoredQueue();
  writeStoredQueue([]);
  for (const event of pending) listener(event);
  return () => {
    listeners.delete(listener);
  };
}

export function reportUsabilityEvent(event: UsabilityEvent): void {
  if (!isUsabilityTestsEnabled()) return;
  if (listeners.size === 0) {
    writeStoredQueue([...readStoredQueue(), event]);
    return;
  }
  for (const listener of listeners) listener(event);
}
