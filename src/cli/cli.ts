#!/usr/bin/env node
import { Command } from "commander";
import readline from "readline";
import { loadConfig } from "../config/ConfigLoader";
import { ModelRouter } from "../models/ModelRouter";
import { PolicyEngine } from "../security/PolicyEngine";
import { SkillRegistry } from "../skills/SkillRegistry";
import { SessionStore } from "../memory/SessionStore";
import { AuditLog } from "../memory/AuditLog";
import { ContextManager } from "../core/context/ContextManager";
import { EventBus } from "../core/events/EventBus";
import { TaskManager } from "../core/tasks/TaskManager";
import { AgentCore } from "../core/agent/AgentCore";

async function buildCore(configPath?: string) {
  const config = await loadConfig(configPath);
  const models = new ModelRouter(config);
  const skills = new SkillRegistry();
  const policy = new PolicyEngine(config.profilesResolved || []);
  const sessions = new SessionStore();
  const audit = new AuditLog();
  const context = new ContextManager();
  const events = new EventBus();
  const tasks = new TaskManager();
  const core = new AgentCore(config, models, policy, skills, sessions, audit, context, events, tasks);

  core.onConfirmation(async (preview: string) => {
    return await promptConfirm(preview);
  });

  return { core, skills, audit, config };
}

async function promptConfirm(preview: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const question = (q: string) => new Promise<string>((resolve) => rl.question(q, resolve));
  const answer = await question(`⚠️  Agent wants to perform: ${preview}\nConfirm? [y/N]: `);
  rl.close();
  return answer.trim().toLowerCase() === "y";
}

async function main() {
  const program = new Command();
  program.name("claw").description("BodhanClaw CLI (alpha)").version("0.0.1-alpha");

  program
    .command("chat")
    .option("--profile <name>", "profile to use")
    .description("Start interactive chat session")
    .action(async (opts) => {
      const { core } = await buildCore();
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: "> " });
      rl.prompt();
      rl.on("line", async (line) => {
        const text = line.trim();
        if (!text) return rl.prompt();
        const answer = await core.runTask(text, opts.profile);
        console.log(answer);
        rl.prompt();
      });
      rl.on("SIGINT", () => rl.close());
    });

  program
    .command("run <task>")
    .option("--profile <name>", "profile to use")
    .description("Run a one-shot task")
    .action(async (task, opts) => {
      const { core } = await buildCore();
      const result = await core.runTask(task, opts.profile);
      console.log(result);
    });

  program
    .command("tools list")
    .description("List available skills")
    .action(async () => {
      const { skills } = await buildCore();
      skills.listManifests().forEach((m) => {
        console.log(`- ${m.name}: ${m.description}`);
      });
    });

  program
    .command("logs tail")
    .option("-n, --lines <count>", "number of lines", "20")
    .description("Tail recent audit log entries")
    .action(async (opts) => {
      const { audit } = await buildCore();
      const lines = await audit.tail(Number(opts.lines));
      lines.forEach((l) => console.log(l));
    });

  await program.parseAsync(process.argv);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
