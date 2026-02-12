import { BodhanConfig } from "../../config/ConfigLoader";
import { ModelRouter } from "../../models/ModelRouter";
import { GenerateResponse, ModelMessage } from "../../models/types";
import { PolicyEngine } from "../../security/PolicyEngine";
import { SkillRegistry } from "../../skills/SkillRegistry";
import { SkillContext } from "../../skills/types";
import { SessionStore } from "../../memory/SessionStore";
import { AuditLog } from "../../memory/AuditLog";
import { ContextManager } from "../context/ContextManager";
import { EventBus } from "../events/EventBus";
import { TaskManager } from "../tasks/TaskManager";

export class AgentCore {
  private confirmationHandler?: (preview: string) => Promise<boolean>;

  constructor(
    private config: BodhanConfig,
    private models: ModelRouter,
    private policy: PolicyEngine,
    private skills: SkillRegistry,
    private sessions: SessionStore,
    private audit: AuditLog,
    private context: ContextManager,
    private events: EventBus,
    private tasks: TaskManager
  ) {}

  onConfirmation(handler: (preview: string) => Promise<boolean>): void {
    this.confirmationHandler = handler;
  }

  async runTask(task: string, profileName?: string): Promise<string> {
    const profile = this.policy.getProfile(profileName || this.config.default_profile);
    const sessionId = await this.sessions.createSession(profile.name, task);
    const taskRec = this.tasks.create(task);
    this.tasks.updateStatus(taskRec.id, "running");
    await this.audit.record({ timestamp: Date.now(), sessionId, event: "task_started", details: { task, profile: profile.name } });

    const messages = this.context.buildMessages(task);
    const tools = this.context.buildTools(this.skills.listManifests());
    const adapter = this.models.getAdapter(this.config.default_model);

    const response = await adapter.generate({ messages, tools });
    const finalText = await this.handleResponse(response, profile.name, sessionId, messages);

    await this.sessions.appendMessage(sessionId, { role: "assistant", content: finalText });
    await this.sessions.completeSession(sessionId, "completed");
    this.tasks.updateStatus(taskRec.id, "completed");
    await this.audit.record({ timestamp: Date.now(), sessionId, event: "task_completed", details: { task, profile: profile.name } });
    return finalText;
  }

  private async handleResponse(resp: GenerateResponse, profileName: string, sessionId: string, messages: ModelMessage[]): Promise<string> {
    if (resp.type === "text") return resp.content;
    if (resp.type === "error") return `Model error: ${resp.content}`;

    // Handle first tool call only (loop TODO)
    const call = resp.toolCalls[0];
    const manifest = this.skills.getManifest(call.name);
    if (!manifest) return `Skill ${call.name} not found`;

    const permission = this.policy.evaluate(call.name, call.arguments, manifest, profileName);
    if (!permission.allowed) {
      if (permission.requiresConfirmation && this.confirmationHandler) {
        const approved = await this.confirmationHandler(permission.preview || call.name);
        if (!approved) return "Permission denied by user";
      } else if (permission.requiresConfirmation) {
        return "Permission denied (confirmation handler missing)";
      } else {
        return `Permission denied: ${permission.reason}`;
      }
    }

    const context: SkillContext = {
      args: call.arguments,
      profile: this.policy.getProfile(profileName),
      config: this.config,
      logger: (msg) => this.events.emit("skill_log", { skill: call.name, msg })
    };

    await this.audit.record({ timestamp: Date.now(), sessionId, event: "tool_called", details: { tool: call.name, args: call.arguments } });
    const result = await this.skills.execute(call.name, context);
    await this.audit.record({ timestamp: Date.now(), sessionId, event: "tool_result", details: { tool: call.name, ok: result.ok } });

    if (!result.ok) return `Tool failed: ${result.error}`;
    messages.push({ role: "tool", content: JSON.stringify(result.data), toolCallId: call.id, toolName: call.name });

    // TODO: loop back into model with tool result; for now return the data directly.
    return typeof result.data === "string" ? result.data : JSON.stringify(result.data);
  }
}
