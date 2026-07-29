type PendingTask = {
  readonly signal: AbortSignal;
  readonly start: () => void;
};

export class ThumbnailRenderQueue {
  private active = 0;
  private readonly pending: PendingTask[] = [];
  private readonly limit: number;

  constructor(limit: number) {
    this.limit = Math.max(1, Math.floor(limit));
  }

  get activeCount() {
    return this.active;
  }

  get pendingCount() {
    return this.pending.length;
  }

  async run<T>(
    task: () => Promise<T>,
    signal: AbortSignal,
  ): Promise<T> {
    await this.acquire(signal);
    try {
      if (signal.aborted) throw new DOMException("Aborted", "AbortError");
      return await task();
    } finally {
      this.active -= 1;
      this.drain();
    }
  }

  private acquire(signal: AbortSignal) {
    if (signal.aborted) {
      return Promise.reject(new DOMException("Aborted", "AbortError"));
    }
    if (this.active < this.limit) {
      this.active += 1;
      return Promise.resolve();
    }
    return new Promise<void>((resolve, reject) => {
      const pending: PendingTask = {
        signal,
        start: () => {
          signal.removeEventListener("abort", cancel);
          this.active += 1;
          resolve();
        },
      };
      const cancel = () => {
        const index = this.pending.indexOf(pending);
        if (index >= 0) this.pending.splice(index, 1);
        reject(new DOMException("Aborted", "AbortError"));
      };
      signal.addEventListener("abort", cancel, { once: true });
      this.pending.push(pending);
    });
  }

  private drain() {
    while (this.active < this.limit && this.pending.length > 0) {
      const next = this.pending.shift();
      if (!next || next.signal.aborted) continue;
      next.start();
    }
  }
}

export const editorThumbnailRenderQueue = new ThumbnailRenderQueue(3);
