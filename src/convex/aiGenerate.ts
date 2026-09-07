"use node";

/**
 * AI generation action (Phase 3A). Lives in its own file because it needs
 * the Node runtime to reach the AI provider — Convex only allows actions in
 * "use node" modules. Pure validation/normalization logic is imported from
 * ./aiPapers so queries/mutations stay in the non-node module.
 */

import { getAuthUserId } from "@convex-dev/auth/server";
import { action } from "./_generated/server";
import { aiPaperGenerateValidator } from "./validators";
import {
  buildPrompt,
  contentMarks,
  contentQuestionCount,
  normalizeAiOutput,
  reviewNotes,
  validateGenerateRequest,
  type AiSection,
  type GenerateRequest,
} from "./aiPapers";
import {
  AiProviderError,
  requestChatCompletion,
  resolveAiProviders,
} from "./aiProvider";

export type GenerationResult = {
  ok: true;
  title: string;
  sections: AiSection[];
  actualMarks: number;
  actualQuestions: number;
  marksMatch: boolean;
  questionsMatch: boolean;
  reviewNotes: string[];
  provider: string;
  model: string;
};

export const generateAiPaper = action({
  args: { input: aiPaperGenerateValidator },
  handler: async (ctx, { input }): Promise<GenerationResult> => {
    // Validate identity before spending tokens.
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    const req: GenerateRequest = validateGenerateRequest(input);
    return generateAiPaperCore(req);
  },
});

/**
 * Run the full generation pipeline (all configured providers, in order,
 * with retry + fallback). Auth is deliberately NOT checked here — the action
 * wrapper above owns authentication.
 */
export async function generateAiPaperCore(
  req: GenerateRequest,
): Promise<GenerationResult> {
  // Ordered provider list — VLY gateway first, Gemini (and any other
  // configured providers) as fallbacks. Throws a clear error when none are
  // configured.
  const providers = resolveAiProviders();

    // The last fallback-eligible provider failure. If every configured
    // provider fails, we surface THIS error — so a Gemini failure is reported
    // as a real Gemini error, never as the earlier VLY 401.
    let lastProviderFailure: AiProviderError | null = null;

    for (const provider of providers) {
      let lastProblem = "";
      // Two attempts per provider: a clean model usually succeeds first; a
      // retry with the exact problem list fixes most malformed outputs
      // without user action.
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const { system, user } = buildPrompt(
            req,
            lastProblem ? [lastProblem] : undefined,
          );
          const raw = await requestChatCompletion({
            provider,
            messages: [
              { role: "system", content: system },
              { role: "user", content: user },
            ],
            model: provider.defaultModel,
            temperature: 0.4,
            maxTokens: 6000,
            jsonMode: true,
          });
          try {
            const { title, sections } = normalizeAiOutput(raw, req);
            const actualMarks = contentMarks(sections);
            const actualQuestions = contentQuestionCount(sections);
            return {
              ok: true as const,
              title,
              sections,
              actualMarks,
              actualQuestions,
              marksMatch: actualMarks === req.totalMarks,
              questionsMatch: actualQuestions === req.questionCount,
              reviewNotes: reviewNotes(req, actualMarks, actualQuestions),
              provider: provider.name,
              model: provider.defaultModel,
            };
          } catch (err) {
            lastProblem =
              err instanceof Error ? err.message : "invalid AI output";
            if (attempt === 2) {
              throw new Error(
                `The AI couldn't produce a valid paper: ${lastProblem} Try generating again.`,
              );
            }
          }
        } catch (err) {
          if (err instanceof AiProviderError && err.fallbackEligible) {
            // Token rejected / rate limited / network failure — specific to
            // this provider, so record it and try the next one.
            lastProviderFailure = err;
            break;
          }
          // Real error (bad request, empty response, malformed output twice,
          // non-fallback HTTP error) — abort; retrying another provider
          // would not change this outcome.
          throw err;
        }
      }
    }

    // Every configured provider failed with a fallback-eligible error.
    // Surface the LAST provider's real error (e.g. the real Gemini status).
    throw (
      lastProviderFailure ??
      new Error("AI generation failed: no provider could complete the request.")
    );
}
