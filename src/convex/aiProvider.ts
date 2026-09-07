/**
 * AI provider abstraction for TeacherDesk (Phase 3A).
 *
 * Generation calls live server-side in Convex actions only — no API key ever
 * reaches the client. Which provider is used is decided entirely by
 * environment variables, so the provider can be swapped later without any UI
 * or schema changes.
 *
 * Resolution order:
 *  1. `AI_API_KEY` + `AI_BASE_URL`   → any OpenAI-compatible endpoint
 *     (OpenRouter, Groq, Together, a local gateway, …). Full URL base, e.g.
 *     `https://api.openai.com/v1` or `https://openrouter.ai/api/v1`.
 *  2. `VLY_INTEGRATION_KEY`          → the Freebuff/VLY AI gateway (the
 *     default for this platform; the key is injected automatically and billed
 *     to the deployment — no per-teacher API key required).
 *  3. `OPENAI_API_KEY`               → api.openai.com directly.
 *
 * The active model defaults per provider and can be overridden with
 * `AI_MODEL`.
 */

export const AI_NOT_CONFIGURED_MESSAGE =
  "AI generation isn't configured yet. Add an AI API key to this project's " +
  "Keys/API keys tab (VLY_INTEGRATION_KEY, or AI_API_KEY with AI_BASE_URL, or " +
  "OPENAI_API_KEY) to enable the question paper generator.";

export type ProviderConfig = {
  name: string;
  baseUrl: string; // OpenAI-compatible base, no trailing slash
  apiKey: string;
  defaultModel: string;
};

export function resolveAiProvider(): ProviderConfig {
  const model = process.env.AI_MODEL;

  const genericKey = process.env.AI_API_KEY;
  const genericBase = process.env.AI_BASE_URL;
  if (genericKey && genericBase) {
    return {
      name: "Custom OpenAI-compatible",
      baseUrl: genericBase.replace(/\/+$/, ""),
      apiKey: genericKey,
      defaultModel: model ?? "gpt-4o-mini",
    };
  }

  const vlyKey = process.env.VLY_INTEGRATION_KEY;
  if (vlyKey) {
    const base = process.env.VLY_INTEGRATION_BASE_URL;
    const host = (base ?? "https://integrations.freebuff.com").replace(/\/+$/, "");
    return {
      name: "Freebuff AI",
      baseUrl: `${host}/v1/llm`,
      apiKey: vlyKey,
      defaultModel: model ?? "gpt-4o-mini",
    };
  }

  const openAiKey = process.env.OPENAI_API_KEY;
  if (openAiKey) {
    return {
      name: "OpenAI",
      baseUrl: "https://api.openai.com/v1",
      apiKey: openAiKey,
      defaultModel: model ?? "gpt-4o-mini",
    };
  }

  throw new Error(AI_NOT_CONFIGURED_MESSAGE);
}

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

type ChatCompletionOptions = {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  /** Request OpenAI-style `response_format: { type: "json_object" }`. */
  jsonMode?: boolean;
};

/** Returns the assistant message content for one chat completion call. */
export async function requestChatCompletion(
  options: ChatCompletionOptions,
): Promise<string> {
  const provider = resolveAiProvider();
  const {
    messages,
    model = provider.defaultModel,
    temperature = 0.4,
    maxTokens = 6000,
    jsonMode = false,
  } = options;

  const payload: Record<string, unknown> = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
  };
  if (jsonMode) payload.response_format = { type: "json_object" };

  let res: Response;
  try {
    res = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${provider.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    throw new Error(
      `AI provider request failed (${provider.name}): ${
        err instanceof Error ? err.message : "network error"
      }`,
    );
  }

  // Some OpenAI-compatible gateways reject `response_format`. Retry once
  // without JSON mode so prompt-driven JSON still works.
  if (!res.ok && jsonMode && res.status === 400) {
    const bodyText = await safeErrorBody(res);
    if (/response_format|json mode|not supported|invalid.*param/i.test(bodyText)) {
      return requestChatCompletion({ ...options, jsonMode: false });
    }
    throw new Error(providerError(provider.name, res.status, bodyText));
  }

  if (!res.ok) {
    throw new Error(providerError(provider.name, res.status, await safeErrorBody(res)));
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.trim().length === 0) {
    throw new Error(`The AI provider returned an empty response (${provider.name}).`);
  }
  return content;
}

async function safeErrorBody(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 400);
  } catch {
    return "";
  }
}

function providerError(providerName: string, status: number, body: string): string {
  if (status === 401 || status === 403) {
    // The gateway is reachable but rejected the deployment's own token — a
    // platform provisioning issue, not something the end user can fix by
    // entering a key. Never dump raw gateway JSON into the UI.
    return (
      `AI generation is unavailable: the AI service rejected this project's ` +
      `access token (HTTP ${status}). Enable AI access for this project, then ` +
      `try again.`
    );
  }
  if (status === 429) {
    return "AI generation is busy right now (rate limited). Please wait a moment and try again.";
  }
  const detail = body ? ` — ${body.trim().slice(0, 200)}` : "";
  return `AI provider error (${providerName}, HTTP ${status})${detail}`;
}
