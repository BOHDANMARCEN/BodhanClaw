import fsp from "fs/promises";
import fs from "fs";
import path from "path";
import os from "os";

const STATE_DIR = path.join(os.homedir(), ".bodhanclaw", "state");
const AUDIT_FILE = path.join(STATE_DIR, "audit.log");

async function ensure() {
  await fsp.mkdir(STATE_DIR, { recursive: true });
}

export interface AuditEntry {
  timestamp: number;
  sessionId?: string;
  event: string;
  details?: Record<string, unknown> | string;
}

export class AuditLog {
  async record(entry: AuditEntry): Promise<void> {
    await ensure();
    await fsp.appendFile(AUDIT_FILE, JSON.stringify(entry) + "\n");
  }

  async tail(lines = 20): Promise<string[]> {
    if (!fs.existsSync(AUDIT_FILE)) return [];
    const data = await fsp.readFile(AUDIT_FILE, "utf8");
    const all = data.trim().split(/\r?\n/);
    return all.slice(-lines);
  }
}
