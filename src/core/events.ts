/** A tiny typed event emitter, so audio/haptics/UI can react to the game without the game knowing about them. */
export class Emitter<M extends object> {
  private handlers: { [K in keyof M]?: Array<(payload: M[K]) => void> } = {};

  on<K extends keyof M>(name: K, fn: (payload: M[K]) => void): () => void {
    (this.handlers[name] ??= []).push(fn);
    return () => {
      this.handlers[name] = this.handlers[name]?.filter(h => h !== fn);
    };
  }

  emit<K extends keyof M>(name: K, payload: M[K]): void {
    for (const fn of this.handlers[name] ?? []) fn(payload);
  }
}
