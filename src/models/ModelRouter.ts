import { BodhanConfig } from "../config/ConfigLoader";
import { ModelAdapter } from "./types";
import { OpenAIAdapter } from "./OpenAIAdapter";
import { OllamaAdapter } from "./OllamaAdapter";

export class ModelRouter {
  private adapters = new Map<string, ModelAdapter>();

  constructor(private config: BodhanConfig) {
    this.bootstrap();
  }

  private bootstrap(): void {
    if (this.config.models.openai) {
      this.adapters.set("openai", new OpenAIAdapter(this.config.models.openai));
    }
    if (this.config.models.local) {
      this.adapters.set("local", new OllamaAdapter(this.config.models.local));
    }
  }

  getAdapter(alias?: string): ModelAdapter {
    const target = alias || this.config.default_model || "openai/gpt-4";
    const provider = target.split("/")[0];
    return this.adapters.get(provider) || new OpenAIAdapter({});
  }
}
