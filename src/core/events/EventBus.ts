export type EventHandler<T = unknown> = (payload: T) => void | Promise<void>;

export class EventBus {
  private handlers = new Map<string, Set<EventHandler>>();

  on<T = unknown>(event: string, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler as EventHandler);
    return () => {
      this.handlers.get(event)?.delete(handler as EventHandler);
    };
  }

  emit<T = unknown>(event: string, payload: T): void {
    const handlers = this.handlers.get(event);
    if (!handlers) return;
    for (const handler of handlers) {
      try {
        handler(payload);
      } catch (err) {
        // ASSUMPTION: logging to console is acceptable in early alpha.
        console.error(`Event handler error for ${event}:`, err);
      }
    }
  }

  async emitAsync<T = unknown>(event: string, payload: T): Promise<void> {
    const handlers = this.handlers.get(event);
    if (!handlers) return;
    await Promise.all(Array.from(handlers).map(async (h) => h(payload)));
  }
}
