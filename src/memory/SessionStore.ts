import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import os from "os";

export type SessionStatus = "active" | "completed" | "failed";

export interface SessionRecord {
  id: string;
  createdAt: number;
  updatedAt: number;
  profile: string;
  purpose?: string;
  status: SessionStatus;
  messages: any[];
}

const STATE_DIR = path.join(os.homedir(), ".bodhanclaw", "state");
const SESSIONS_FILE = path.join(STATE_DIR, "sessions.jsonl");

async function ensureStateDir() {
  await fsp.mkdir(STATE_DIR, { recursive: true });
}

function makeId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export class SessionStore {
  async createSession(profile: string, purpose?: string): Promise<string> {
    await ensureStateDir();
    const rec: SessionRecord = {
      id: makeId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      profile,
      purpose,
      status: "active",
      messages: []
    };
    await fsp.appendFile(SESSIONS_FILE, JSON.stringify(rec) + "\n");
    return rec.id;
  }

  async appendMessage(sessionId: string, message: any): Promise<void> {
    // ASSUMPTION: append-only; in-memory update not persisted per-message in this stub.
    message.sessionId = sessionId;
    await ensureStateDir();
    await fsp.appendFile(path.join(STATE_DIR, "messages.jsonl"), JSON.stringify(message) + "\n");
  }

  async completeSession(sessionId: string, status: SessionStatus = "completed"): Promise<void> {
    await ensureStateDir();
    await fsp.appendFile(path.join(STATE_DIR, "session_status.jsonl"), JSON.stringify({ sessionId, status, at: Date.now() }) + "\n");
  }
}
