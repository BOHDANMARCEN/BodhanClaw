import fs from "fs/promises";
import path from "path";
import { SkillManifest } from "../security/types";
import { SkillContext, SkillResult } from "./types";

export const manifest: SkillManifest = {
  name: "filesystem.read",
  description: "Read a text file from a safe directory",
  permissions: {
    fs: { read: ["~/workspace", "/project", "./"] },
    net: { outbound: [] },
    shell: false
  },
  user_confirmation: { required: false },
  args: {
    type: "object",
    properties: { path: { type: "string" } },
    required: ["path"]
  }
};

export async function execute(context: SkillContext): Promise<SkillResult> {
  const target = path.resolve(context.args.path);
  try {
    const content = await fs.readFile(target, "utf8");
    return { ok: true, data: content };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Failed to read file" };
  }
}
