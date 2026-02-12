export type TaskStatus = "pending" | "running" | "completed" | "failed";

export interface TaskRecord {
  id: string;
  text: string;
  status: TaskStatus;
  createdAt: number;
  updatedAt: number;
}

export class TaskManager {
  private tasks = new Map<string, TaskRecord>();

  create(text: string): TaskRecord {
    const id = `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const rec: TaskRecord = { id, text, status: "pending", createdAt: Date.now(), updatedAt: Date.now() };
    this.tasks.set(id, rec);
    return rec;
  }

  updateStatus(id: string, status: TaskStatus): void {
    const rec = this.tasks.get(id);
    if (!rec) return;
    rec.status = status;
    rec.updatedAt = Date.now();
  }

  get(id: string): TaskRecord | undefined {
    return this.tasks.get(id);
  }
}
