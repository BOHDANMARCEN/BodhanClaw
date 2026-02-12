import { exec } from "child_process";
import util from "util";
import { SkillManifest } from "../security/types";
import { SkillContext, SkillResult } from "./types";

const execAsync = util.promisify(exec);

export const manifest: SkillManifest = {
  name: "git.status",
  description: "Run git status --short in the current repository",
  permissions: {
    shell: true,
    net: { outbound: [] }
  },
  user_confirmation: { required: false },
  args: {
    type: "object",
    properties: { cwd: { type: "string" } }
  }
};

export async function execute(context: SkillContext): Promise<SkillResult> {
  try {
    const cwd = context.args.cwd as string | undefined;
    const { stdout, stderr } = await execAsync("git status --short", { cwd });
    const output = stdout || stderr || "(no output)";
    return { ok: true, data: output };
  } catch (err: any) {
    return { ok: false, error: err?.message || "git status failed" };
  }
}
