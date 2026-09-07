/**
 * AI provider abstraction for TeacherDesk (Phase 3A).
 *
 * Generation calls live server-side in Convex actions only — no API key ever
 * reaches the client. Which providers are available and in what order is
 * decided entirely by environment variables, so providers can be added or
 * reordered later without any UI or schema changes.
 *
 * Provider list (in order — the action tries each until one succeeds):
 *  1. `AI_API_KEY` + `AI_BASE_URL`   → any OpenAI-compatible endpoint
 *     (OpenRouter, Groq, Together, a local gateway, …). Full URL base, e.g.
 *     `https://api.openai.com/v1` or `https://openrouter.ai/api/v1`.
 *  2. `VLY_INTEGRATION_KEY`          → the Freebuff/VLY AI gateway (the
 *     platform default; the key is injected automatically and billed to the
 *     deployment — no per-teacher API key required).
 *  3. `GEMINI_API_KEY`               → Google Gemini via its official
 *     OpenAI-compatible endpoint (https://generativelanguage.googleapis.com/
 *     v1beta/openai). Used as the fallback when the VLY gateway rejects or
 *     fails, e.g. HTTP 401.
 *  4. `OPENAI_API_KEY`               → api.openai.com directly.
 *
 * A provider that fails with a *fallback-eligible* error (token rejected,
 * rate limited, or network failure) is skipped and the next provider is
 * tried. All other failures are real errors and abort generation. The active
 * model defaults per provider and can be overridden with `AI_MODEL`.
 */

export const AI_NOT_CONFIGURED_MESSAGE =
  "AI generation isn't configured yet. Add an AI API key to this project's " +
  "Keys/API keys tab (VLY_INTEGRATION_KEY, GEMINI_API_KEY, or AI_API_KEY with " +
  "AI_BASE_URL) to enable the question paper generator.";

export type ProviderConfig = {
  name: string;
  baseUrl: string; // OpenAI-compatible base, no trailing slash
  apiKey: string;
  defaultModel: string;
};

export const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai";
export const GEMINI_DEFAULT_MODEL = "gemini-3.8-flash";

/** Ordered list of configured providers. Throws when none are configured. */
export function resolveAiProviders(): ProviderConfig[] {
  const model = process.env.AI_MODEL;
  const providers: ProviderConfig[] = [];

  // 1. Explicit custom OpenAI-compatible endpoint (highest priority opt-in).
  const genericKey = process.env.AI_API_KEY;
  const genericBase = process.env.AI_BASE_URL;
  if (genericKey && genericBase) {
    providers.push({
      name: "Custom OpenAI-compatible",
      baseUrl: genericBase.replace(/\/+$/, ""),
      apiKey: genericKey,
      defaultModel: model ?? "gpt-4o-mini",
    });
  }

  // 2. Freebuff/VLY AI gateway — the platform default.
  const vlyKey = process.env.VLY_INTEGRATION_KEY;
  if (vlyKey) {
    const base = process.env.VLY_INTEGRATION_BASE_URL;
    const host = (base ?? "https://integrations.freebuff.com").replace(/\/+$/, "");
    providers.push({
      name: "Freebuff AI",
      baseUrl: `${host}/v1/llm`,
      apiKey: vlyKey,
      defaultModel: model ?? "gpt-4o-mini",
    });
  }

  // 3. Google Gemini — fallback for when the platform gateway is unavailable
  //    (e.g. its token is rejected). Official OpenAI-compatible endpoint.
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    providers.push({
      name: "Gemini",
      baseUrl: GEMINI_BASE_URL,
      apiKey: geminiKey,
      defaultModel: model ?? GEMINI_DEFAULT_MODEL,
    });
  }

  // 4. OpenAI directly — legacy escape hatch, tried last.
  const openAiKey = process.env.OPENAI_API_KEY;
  if (openAiKey) {
    providers.push({
      name: "OpenAI",
      baseUrl: "https://api.openai.com/v1",
      apiKey: openAiKey,
      defaultModel: model ?? "gpt-4o-mini",
    });
  }

  if (providers.length === 0) throw new Error(AI_NOT_CONFIGURED_MESSAGE);
  return providers;
}

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

type ChatCompletionOptions = {
  /** The specific provider to call (from `resolveAiProviders()`). */
  provider: ProviderConfig;
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  /** Request OpenAI-style `response_format: { type: "json_object" }`. */
  jsonMode?: boolean;
};

/**
 * Provider failure that the generation action may recover from by trying the
 * next configured provider. `fallbackEligible` is true for token/auth
 * rejection (401/403), rate limiting (429), and network failures — all of
 * which are specific to one provider and may not affect another. Everything
 * else (bad requests, malformed responses, server errors) is a real error.
 */
export class AiProviderError extends Error {
  readonly providerName: string;
  readonly status: number;
  readonly fallbackEligible: boolean;

  constructor(
    message: string,
    providerName: string,
    status: number,
    fallbackEligible: boolean,
  ) {
    super(message);
    this.name = "AiProviderError";
    this.providerName = providerName;
    this.status = status;
    this.fallbackEligible = fallbackEligible;
  }
}

function providerErrorMessage(
  providerName: string,
  status: number,
  body: string,
): { message: string; fallbackEligible: boolean } {
  if (status === 401 || status === 403) {
    if (providerName === "Freebuff AI") {
      // The gateway is reachable but rejected the deployment's own token — a
      // platform provisioning issue, not something an end user fixes by
      // entering a key. Keep the friendly platform wording. This IS eligible
      // for fallback to another provider (e.g. Gemini).
      return {
        message:
          `AI generation is unavailable: the AI service rejected this project's ` +
          `access token (HTTP ${status}). The fallback provider is being used if ` +
          `one is configured.`,
        fallbackEligible: true,
      };
    }
    return {
      message:
        `The ${providerName} provider rejected the API key (HTTP ${status}). ` +
        `Check the key in this project's Keys tab, then try again.`,
      fallbackEligible: true,
    };
  }
  if (status === 429) {
    return {
      message: `The ${providerName} provider is rate limited (HTTP 429). Please wait a moment and try again.`,
      fallbackEligible: true,
    };
  }
  const detail = body ? ` — ${body.trim().slice(0, 200)}` : "";
  return {
    message: `AI provider error (${providerName}, HTTP ${status})${detail}`,
    fallbackEligible: false,
  };
}

/** Returns the assistant message content for one chat completion call. */
export async function requestChatCompletion(
  options: ChatCompletionOptions,
): Promise<string> {
  const {
    provider,
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
    // Network-level failure — provider-specific, so the next provider may work.
    throw new AiProviderError(
      `AI provider request failed (${provider.name}): ${
        err instanceof Error ? err.message : "network error"
      }`,
      provider.name,
      0,
      true,
    );
  }

  // Some OpenAI-compatible gateways reject `response_format`. Retry once
  // without JSON mode so prompt-driven JSON still works.
  if (!res.ok && jsonMode && res.status === 400) {
    const bodyText = await safeErrorBody(res);
    if (/response_format|json mode|not supported|invalid.*param/i.test(bodyText)) {
      return requestChatCompletion({ ...options, jsonMode: false });
    }
    const { message, fallbackEligible } = providerErrorMessage(
      provider.name,
      res.status,
      bodyText,
    );
    throw new AiProviderError(message, provider.name, res.status, fallbackEligible);
  }

  if (!res.ok) {
    const { message, fallbackEligible } = providerErrorMessage(
      provider.name,
      res.status,
      await safeErrorBody(res),
    );
    throw new AiProviderError(message, provider.name, res.status, fallbackEligible);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.trim().length === 0) {
    throw new AiProviderError(
      `The AI provider returned an empty response (${provider.name}).`,
      provider.name,
      0,
      false,
    );
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