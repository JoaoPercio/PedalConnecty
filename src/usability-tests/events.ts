import { isUsabilityTestsEnabled } from "./config";
import type { UsabilityEvent } from "./types";

type Listener = (event: UsabilityEvent) => void;

const listeners = new Set<Listener>();
const queue: UsabilityEvent[] = [];

export function subscribeUsabilityEvents(listener: Listener): () => void {
  listeners.add(listener);
  if (queue.length > 0) {
    const pending = queue.splice(0, queue.length);
    for (const event of pending) listener(event);
  }
  return () => {
    listeners.delete(listener);
  };
}

export function reportUsabilityEvent(event: UsabilityEvent): void {
  if (!isUsabilityTestsEnabled()) return;
  if (listeners.size === 0) {
    queue.push(event);
    return;
  }
  for (const listener of listeners) listener(event);
}
