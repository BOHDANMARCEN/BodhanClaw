export type PermissionFS = {
  read?: string[];
  write?: string[];
};

export type PermissionNet = {
  outbound?: string[];
};

export interface SkillPermissions {
  fs?: PermissionFS;
  net?: PermissionNet;
  shell?: boolean;
}

export interface UserConfirmation {
  required: boolean;
}

export interface SkillManifest {
  name: string;
  description: string;
  permissions: SkillPermissions;
  user_confirmation?: UserConfirmation;
  args?: unknown;
}

export interface SkillOverride {
  pathAllowlist?: string[];
  pathDenylist?: string[];
  requireConfirmation?: boolean;
  commandAllowlist?: string[];
  dangerousPatterns?: string[];
}

export interface Profile {
  name: string;
  allowedSkills: string[];
  autoConfirm: boolean;
  skillOverrides?: Record<string, SkillOverride>;
}

export interface PermissionResult {
  allowed: boolean;
  reason?: string;
  requiresConfirmation?: boolean;
  preview?: string;
}
