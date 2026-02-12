import { exec } from "child_process";
import util from "util";
import { SkillManifest } from "../security/types";
import { SkillContext, SkillResult } from "./types";

const execAsync = util.promisify(exec);

export const manifest: SkillManifest = {
  name: "shell.run",
  description: "Execute a shell command (guarded and confirmable)",
  permissions: {
    shell: true,
    net: { outbound: [] }
  },
  user_confirmation: { required: true },
  args: {
    type: "object",
    properties: { cmd: { type: "string" }, cwd: { type: "string" } },
    required: ["cmd"]
  }
};

export async function execute(context: SkillContext): Promise<SkillResult> {
  const cmd = context.args.cmd as string;
  const cwd = context.args.cwd as string | undefined;
  try {
    const { stdout, stderr } = await execAsync(cmd, { cwd });
    const output = stdout || stderr || "(no output)";
    return { ok: true, data: output };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Command failed" };
  }
}
