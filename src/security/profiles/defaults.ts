import { Profile } from "../types";

export const defaultProfiles: Profile[] = [
  {
    name: "dev",
    allowedSkills: ["filesystem.*", "git.*", "shell.run"],
    autoConfirm: false,
    skillOverrides: {
      "shell.run": {
        requireConfirmation: true,
        dangerousPatterns: ["rm -rf", "sudo", "chmod 777"]
      }
    }
  },
  {
    name: "readonly",
    allowedSkills: ["filesystem.read", "git.status"],
    autoConfirm: true
  }
];

export function findProfile(name: string, profiles: Profile[]): Profile {
  return profiles.find((p) => p.name === name) ||
    defaultProfiles.find((p) => p.name === name) ||
    defaultProfiles[defaultProfiles.length - 1];
}
