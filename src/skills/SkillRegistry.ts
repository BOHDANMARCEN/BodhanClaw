import { SkillManifest } from "../security/types";
import { Skill, SkillContext, SkillResult } from "./types";
import * as fsRead from "./filesystem.read";
import * as shellRun from "./shell.run";
import * as gitStatus from "./git.status";

export class SkillRegistry {
  private skills = new Map<string, Skill>();

  constructor() {
    this.register({ manifest: fsRead.manifest, execute: fsRead.execute });
    this.register({ manifest: shellRun.manifest, execute: shellRun.execute });
    this.register({ manifest: gitStatus.manifest, execute: gitStatus.execute });
  }

  register(skill: Skill): void {
    this.skills.set(skill.manifest.name, skill);
  }

  listManifests(): SkillManifest[] {
    return Array.from(this.skills.values()).map((s) => s.manifest);
  }

  getManifest(name: string): SkillManifest | undefined {
    return this.skills.get(name)?.manifest;
  }

  async execute(name: string, context: SkillContext): Promise<SkillResult> {
    const skill = this.skills.get(name);
    if (!skill) {
      return { ok: false, error: `Skill ${name} not found` };
    }
    return skill.execute(context);
  }
}
