export interface ModelMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  toolCallId?: string;
  toolName?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface GenerateRequest {
  messages: ModelMessage[];
  tools?: ToolDescription[];
  temperature?: number;
  maxTokens?: number;
}

export type GenerateResponse =
  | { type: "text"; content: string }
  | { type: "tool_call"; toolCalls: ToolCall[] }
  | { type: "error"; content: string };

export interface ToolDescription {
  name: string;
  description: string;
  parameters?: unknown;
}

export interface ModelFeatures {
  streaming?: boolean;
  functionCalling?: boolean;
}

export interface ModelAdapter {
  name: string;
  supportsToolCalling: boolean;
  supportedFeatures: ModelFeatures;
  generate(request: GenerateRequest): Promise<GenerateResponse>;
}
