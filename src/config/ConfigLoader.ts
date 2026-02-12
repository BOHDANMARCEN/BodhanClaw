import fs from "fs";
import path from "path";
import os from "os";
import YAML from "yaml";
import { Profile } from "../security/types";
import { defaultProfiles } from "../security/profiles/defaults";

export interface ProfileConfigEntry {
  allowed_skills: string[];
  auto_confirm: boolean;
  skill_overrides?: Record<string, unknown>;
}

export interface BodhanConfig {
  default_model: string;
  default_profile: string;
  models: Record<string, any>;
  profiles: Record<string, ProfileConfigEntry>;
  profilesResolved?: Profile[];
}

const DEFAULT_CONFIG: BodhanConfig = {
  default_model: "local/llama2",
  default_profile: "readonly",
  models: {
    local: { type: "ollama", base_url: "http://localhost:11434", model: "llama2" }
  },
  profiles: {}
};

export function resolveConfigPath(customPath?: string): string {
  if (customPath) return path.resolve(customPath);
  return path.join(os.homedir(), ".bodhanclaw", "config.yml");
}

export async function loadConfig(configPath?: string): Promise<BodhanConfig> {
  const fullPath = resolveConfigPath(configPath);
  let config: BodhanConfig = { ...DEFAULT_CONFIG };

  if (fs.existsSync(fullPath)) {
    const raw = fs.readFileSync(fullPath, "utf8");
    const parsed = (YAML.parse(raw) || {}) as Partial<BodhanConfig>;
    config = {
      ...config,
      ...parsed,
      models: { ...DEFAULT_CONFIG.models, ...(parsed.models || {}) },
      profiles: parsed.profiles || {}
    };
  } else {
    // ASSUMPTION: missing config is acceptable during bootstrap; using defaults.
  }

  config.profilesResolved = hydrateProfiles(config);
  return config;
}

function hydrateProfiles(config: BodhanConfig): Profile[] {
  const fromConfig: Profile[] = Object.entries(config.profiles || {}).map(([name, p]) => ({
    name,
    allowedSkills: p.allowed_skills || [],
    autoConfirm: Boolean(p.auto_confirm),
    skillOverrides: (p.skill_overrides || {}) as Record<string, any>
  }));

  const defaults = defaultProfiles.filter((d) => !fromConfig.find((p) => p.name === d.name));
  return [...fromConfig, ...defaults];
}
