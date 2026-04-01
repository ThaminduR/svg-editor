export class TypedEventEmitter<EventMap extends Record<string, unknown>> {
  private listeners = new Map<keyof EventMap, Set<(data: never) => void>>();

  on<K extends keyof EventMap>(event: K, handler: (data: EventMap[K]) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler as (data: never) => void);
    return () => this.off(event, handler);
  }

  off<K extends keyof EventMap>(event: K, handler: (data: EventMap[K]) => void): void {
    this.listeners.get(event)?.delete(handler as (data: never) => void);
  }

  emit<K extends keyof EventMap>(
    event: K,
    ...args: EventMap[K] extends void ? [] : [data: EventMap[K]]
  ): void {
    this.listeners.get(event)?.forEach((handler) => {
      (handler as (data: EventMap[K]) => void)(args[0] as EventMap[K]);
    });
  }
}
