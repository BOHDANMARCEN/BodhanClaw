import { GenerateRequest, GenerateResponse, ModelAdapter, ModelFeatures } from "./types";

export class OllamaAdapter implements ModelAdapter {
  name = "ollama";
  supportsToolCalling = false;
  supportedFeatures: ModelFeatures = { streaming: true };

  constructor(private config: Record<string, any>) {}

  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    // Local-first stub; real integration would call Ollama HTTP API.
    const lastUser = [...request.messages].reverse().find((m) => m.role === "user");
    const content = lastUser?.content || "";
    return {
      type: "text",
      content: `[mock-ollama:${this.config.model || "unknown"}] ${content}`
    };
  }
}
