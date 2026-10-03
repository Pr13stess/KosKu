import { seed, State } from "./seed";
export interface Storage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}
export class MockStore {
  private state: State | undefined;
  private queue: Promise<unknown> = Promise.resolve();
  private listeners = new Set<() => void>();
  constructor(private storage: Storage) {}
  async read(): Promise<State> {
    await this.queue;
    if (!this.state) {
      const saved = await this.storage.getItem("kosku-owner-demo-v1");
      this.state = saved ? (JSON.parse(saved) as State) : seed();
    }
    return structuredCloneSafe(this.state);
  }
  async write<T>(fn: (s: State) => T): Promise<T> {
    const task = this.queue.then(async () => {
      if (!this.state) {
        const saved = await this.storage.getItem("kosku-owner-demo-v1");
        this.state = saved ? (JSON.parse(saved) as State) : seed();
      }
      const next = structuredCloneSafe(this.state);
      const result = fn(next);
      await this.storage.setItem("kosku-owner-demo-v1", JSON.stringify(next));
      this.state = next;
      this.listeners.forEach((l) => l());
      return result;
    });
    this.queue = task.catch(() => {});
    return task;
  }
  watch(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}
const structuredCloneSafe = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
