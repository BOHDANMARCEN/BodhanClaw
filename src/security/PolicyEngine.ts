import path from "path";
import os from "os";
import { PermissionResult, Profile, SkillManifest, SkillOverride } from "./types";
import { findProfile } from "./profiles/defaults";

function matchPattern(target: string, pattern: string): boolean {
  const escaped = pattern.replace(/[-/\\^$+?.()|[\]{}]/g, "\\$&").replace(/\*/g, ".*");
  const regex = new RegExp(`^${escaped}$`, "i");
  return regex.test(target);
}

function matchesAny(target: string, patterns: string[] = []): boolean {
  return patterns.some((p) => matchPattern(target, p));
}

function expandHome(p: string): string {
  if (p.startsWith("~/")) {
    return path.join(os.homedir(), p.slice(2));
  }
  return p;
}

export class PolicyEngine {
  constructor(private profiles: Profile[]) {}

  getProfile(profileName: string): Profile {
    return findProfile(profileName, this.profiles);
  }

  evaluate(skillName: string, args: Record<string, unknown>, manifest: SkillManifest, profileName: string): PermissionResult {
    const profile = this.getProfile(profileName);

    const isAllowed = profile.allowedSkills.some((p) => matchPattern(skillName, p));
    if (!isAllowed) {
      return { allowed: false, reason: "skill_not_in_profile" };
    }

    const override: SkillOverride | undefined = profile.skillOverrides?.[skillName];

    // Filesystem checks
    const fsPerm = manifest.permissions.fs;
    if (fsPerm && (fsPerm.read?.length || fsPerm.write?.length)) {
      const candidatePath = typeof args.path === "string" ? path.resolve(args.path) : undefined;
      const allowlist = (override?.pathAllowlist || fsPerm.read || fsPerm.write || []).map(expandHome);
      const denylist = (override?.pathDenylist || []).map(expandHome);

      if (!candidatePath || !matchesAny(candidatePath, allowlist)) {
        return { allowed: false, reason: "path_not_in_allowlist" };
      }
      if (matchesAny(candidatePath, denylist)) {
        return { allowed: false, reason: "path_in_denylist" };
      }
    }

    // Shell checks
    if (manifest.permissions.shell) {
      const cmd = typeof (args as any).cmd === "string" ? (args as any).cmd : "";
      const dangerous = override?.dangerousPatterns || [];
      if (dangerous.some((pat) => cmd.includes(pat))) {
        return { allowed: false, reason: "dangerous_command_pattern", requiresConfirmation: true, preview: cmd };
      }
      const allowlist = override?.commandAllowlist;
      if (allowlist && allowlist.length && !matchesAny(cmd, allowlist)) {
        return { allowed: false, reason: "command_not_allowed", requiresConfirmation: true, preview: cmd };
      }
    }

    // Confirmation
    const needsConfirm = manifest.user_confirmation?.required || override?.requireConfirmation;
    if (needsConfirm && !profile.autoConfirm) {
      return { allowed: false, reason: "requires_user_confirmation", requiresConfirmation: true, preview: this.preview(skillName, args) };
    }

    return { allowed: true };
  }

  private preview(skill: string, args: Record<string, unknown>): string {
    const summary = Object.entries(args || {})
      .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
      .join(", ");
    return `${skill}(${summary})`;
  }
}
