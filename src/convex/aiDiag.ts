"use node";

/**
 * TEMPORARY diagnostic actions — created only to verify the AI provider
 * chain (VLY → Gemini fallback) from the CLI. Removed after the test.
 *
 * These deliberately do NOT check auth and never return secret values:
 * envCheck reports only booleans + provider names/models/base URLs.
 */

import { action } from "./_generated/server";
import { v } from "convex/values";
import { aiPaperGenerateValidator } from "./validators";
import { validateGenerateRequest } from "./aiPapers";
import { generateAiPaperCore } from "./aiGenerate";
import { requestChatCompletion, resolveAiProviders } from "./aiProvider";

export const envCheck = action({
  args: {},
  handler: async () => {
    const providers = resolveAiProviders().map((p) => ({
      name: p.name,
      baseUrl: p.baseUrl,
      model: p.defaultModel,
    }));
    return {
      geminiKeyPresent: !!process.env.GEMINI_API_KEY,
      vlyKeyPresent: !!process.env.VLY_INTEGRATION_KEY,
      openAiKeyPresent: !!process.env.OPENAI_API_KEY,
      customConfigured: !!(process.env.AI_API_KEY && process.env.AI_BASE_URL),
      aiModelOverride: process.env.AI_MODEL ?? null,
      providers,
    };
  },
});

/** Minimal probe: does the Gemini endpoint accept this model right now? */
export const probeGeminiModel = action({
  args: { model: v.string() },
  handler: async (_ctx, { model }) => {
    const providers = resolveAiProviders();
    const gemini = providers.find((p) => p.name === "Gemini");
    if (!gemini) return { ok: false, message: "Gemini provider not configured" };
    try {
      const content = await requestChatCompletion({
        provider: gemini,
        messages: [{ role: "user", content: "Reply with exactly: OK" }],
        model,
        temperature: 0,
        maxTokens: 10,
      });
      return { ok: true, content: content.slice(0, 80) };
    } catch (err) {
      const e = err as Error & { status?: number };
      return {
        ok: false,
        status: typeof e?.status === "number" ? e.status : null,
        message: e?.message ?? String(err),
      };
    }
  },
});

export const runGenerationTest = action({
  args: { input: aiPaperGenerateValidator },
  handler: async (_ctx, { input }) => {
    try {
      const req = validateGenerateRequest(input);
      const result = await generateAiPaperCore(req);
      return { ok: true, result };
    } catch (err) {
      const e = err as Error & { status?: number };
      return {
        ok: false,
        name: e?.name ?? "Error",
        status: typeof e?.status === "number" ? e.status : null,
        message: e?.message ?? String(err),
      };
    }
  },
});