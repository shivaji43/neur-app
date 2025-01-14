export const EVENTS = {
  ACTION_CREATED: 'action-created',
} as const;

export function emitActionCreated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENTS.ACTION_CREATED));
  }
} 