import { Profile, SkillManifest } from "../security/types";
import { BodhanConfig } from "../config/ConfigLoader";

export interface SkillContext {
  args: Record<string, any>;
  profile: Profile;
  config: BodhanConfig;
  logger?: (msg: string) => void;
}

export interface SkillResult {
  ok: boolean;
  data?: unknown;
  error?: string;
}

export interface Skill {
  manifest: SkillManifest;
  execute(context: SkillContext): Promise<SkillResult>;
}
