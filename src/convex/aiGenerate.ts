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
import { requestChatCompletion, resolveAiProvider } from "./aiProvider";

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
    const provider = resolveAiProvider(); // clear error when not configured

    let lastProblem = "";
    // Two attempts: a clean model usually succeeds first; a retry with the
    // exact problem list fixes most malformed outputs without user action.
    for (let attempt = 1; attempt <= 2; attempt++) {
      const { system, user } = buildPrompt(
        req,
        lastProblem ? [lastProblem] : undefined,
      );
      const raw = await requestChatCompletion({
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
        lastProblem = err instanceof Error ? err.message : "invalid AI output";
        if (attempt === 2) {
          throw new Error(
            `The AI couldn't produce a valid paper: ${lastProblem} Try generating again.`,
          );
        }
      }
    }
    throw new Error("Generation failed unexpectedly.");
  },
});
