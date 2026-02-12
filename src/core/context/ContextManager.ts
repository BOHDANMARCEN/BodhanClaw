import { ModelMessage, ToolDescription } from "../../models/types";
import { SkillManifest } from "../../security/types";

export class ContextManager {
  buildMessages(task: string): ModelMessage[] {
    return [
      { role: "system", content: "You are BodhanClaw, a local-first, security-first agent." },
      { role: "user", content: task }
    ];
  }

  buildTools(manifests: SkillManifest[]): ToolDescription[] {
    return manifests.map((m) => ({
      name: m.name,
      description: m.description,
      parameters: m.args
    }));
  }
}
