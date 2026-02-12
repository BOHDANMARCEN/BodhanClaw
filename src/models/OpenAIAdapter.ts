import { GenerateRequest, GenerateResponse, ModelAdapter, ModelFeatures } from "./types";

export class OpenAIAdapter implements ModelAdapter {
  name = "openai";
  supportsToolCalling = true;
  supportedFeatures: ModelFeatures = { streaming: true, functionCalling: true };

  constructor(private config: Record<string, any>) {}

  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    // Stubbed to keep offline/local-first bootstrap working.
    const lastUser = [...request.messages].reverse().find((m) => m.role === "user");
    const content = lastUser?.content || "";
    return {
      type: "text",
      content: `[mock-openai] ${content}`
    };
  }
}
