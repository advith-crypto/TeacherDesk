/**
 * AI Question Paper Generator — Phase 3A (persistence + shared logic).
 *
 * This module holds:
 *  - validation/normalization/prompt logic shared by the generator action
 *    (which lives in ./aiGenerate.ts because it needs the Node runtime to
 *    call the AI provider), and
 *  - the user-owned persistence layer for saved AI papers (queries and
 *    mutations), following the conventions of lessons/corrections/
 *    questionPapers/examSeating.
 *
 * Structure is intentional: the AI call happens only server-side inside the
 * action; nothing here ever receives or exposes an API key.
 */

import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import {
  AI_DIFFICULTY_VALUES,
  AI_PAPER_STATUS_VALUES,
  AI_QUESTION_TYPE_VALUES,
  aiPaperSaveValidator,
} from "./validators";

// ---------------------------------------------------------------------------
// Shared validation
// ---------------------------------------------------------------------------

export type GenerateRequest = {
  subject: string;
  classGrade: string;
  section?: string;
  examType: string;
  topics: string;
  totalMarks: number;
  questionCount: number;
  durationMinutes?: number;
  difficulty: string;
  questionTypes: string[];
  additionalInstructions?: string;
};

export const MAX_AI_MARKS = 1000;
export const MAX_AI_QUESTIONS = 80;

export function clean(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function validateGenerateRequest(req: GenerateRequest): GenerateRequest {
  const subject = clean(req.subject);
  if (!subject) throw new Error("Subject is required");
  if (subject.length > 120) throw new Error("Subject is too long");
  const classGrade = clean(req.classGrade);
  if (!classGrade) throw new Error("Class / grade is required");
  if (classGrade.length > 120) throw new Error("Class / grade is too long");
  const examType = clean(req.examType);
  if (!examType) throw new Error("Exam type is required");
  if (examType.length > 120) throw new Error("Exam type is too long");
  const topics = req.topics.trim();
  if (!topics)
    throw new Error("Topics / syllabus is required so the AI stays on your syllabus");
  if (topics.length > 4000) throw new Error("Topics / syllabus is too long (4000 character limit)");

  const { totalMarks, questionCount } = req;
  if (
    !Number.isInteger(totalMarks) ||
    totalMarks <= 0 ||
    totalMarks > MAX_AI_MARKS
  )
    throw new Error(`Total marks must be a whole number from 1 to ${MAX_AI_MARKS}`);
  if (
    !Number.isInteger(questionCount) ||
    questionCount <= 0 ||
    questionCount > MAX_AI_QUESTIONS
  )
    throw new Error(
      `Number of questions must be a whole number from 1 to ${MAX_AI_QUESTIONS}`,
    );

  if (req.durationMinutes !== undefined) {
    if (
      !Number.isInteger(req.durationMinutes) ||
      req.durationMinutes <= 0 ||
      req.durationMinutes > 720
    )
      throw new Error(
        "Duration must be a positive whole number of minutes (max 720)",
      );
  }
  if (!AI_DIFFICULTY_VALUES.includes(req.difficulty as never))
    throw new Error("Please choose a difficulty: Easy, Medium, Hard or Mixed");
  if (req.questionTypes.length === 0) throw new Error("Select at least one question type");
  for (const t of req.questionTypes) {
    if (!AI_QUESTION_TYPE_VALUES.includes(t as never))
      throw new Error(`Unsupported question type "${t}"`);
  }
  if (req.additionalInstructions && req.additionalInstructions.trim().length > 2000)
    throw new Error("Additional instructions are too long (2000 character limit)");

  return {
    subject,
    classGrade,
    section: req.section?.trim() || undefined,
    examType,
    topics,
    totalMarks,
    questionCount,
    durationMinutes: req.durationMinutes,
    difficulty: req.difficulty,
    questionTypes: [...req.questionTypes],
    additionalInstructions: req.additionalInstructions?.trim() || undefined,
  };
}

function questionTypesLabel(types: string[]): string {
  const list = AI_QUESTION_TYPE_VALUES.filter((t) => types.includes(t));
  if (list.length === AI_QUESTION_TYPE_VALUES.length)
    return "any appropriate mix of types";
  return list.join(", ");
}

function marksGuidance(totalMarks: number, questionCount: number): string {
  if (questionCount === 1) {
    return `The single question should carry all ${totalMarks} marks.`;
  }
  const per = Math.floor(totalMarks / questionCount);
  const remainder = totalMarks - per * questionCount;
  const base =
    per > 0
      ? `Most questions should carry ${per} or ${per + 1} marks each`
      : "Questions should carry whole marks";
  const remNote =
    remainder > 0
      ? ` (exactly ${remainder} ${remainder === 1 ? "question" : "questions"} get one extra mark so the total lands on ${totalMarks})`
      : "";
  return `${base}${remNote}. The marks across ALL questions must sum exactly to ${totalMarks}.`;
}

/** Build the system + user prompt for one generation attempt. */
export function buildPrompt(
  req: GenerateRequest,
  previousProblems?: string[],
): { system: string; user: string } {
  const system =
    "You are an expert teacher and question-paper setter. You produce exam " +
    "questions strictly from the supplied syllabus/topics. You never invent " +
    "external curriculum requirements, board alignments, or textbooks, and you " +
    "never mention a board or curriculum unless the teacher provided one. " +
    "Questions must be original and non-duplicated, clearly worded, and " +
    "appropriate for the class/grade. All numerical values you return must be " +
    "internally consistent with the requirements (marks total to the requested " +
    "total; question count matches; question types match the requested set). " +
    "Return ONLY valid JSON matching the requested schema — no markdown " +
    "fences, no commentary, no extra keys.";

  const userParts = [
    `Create a question paper for: ${req.examType} — ${req.subject} (${req.classGrade}${req.section ? `, section ${req.section}` : ""})`,
    "",
    "Syllabus / topics to cover (ONLY these):",
    req.topics,
    "",
    `Total marks: ${req.totalMarks}`,
    `Number of questions: ${req.questionCount}`,
    req.durationMinutes
      ? `Duration: ${req.durationMinutes} minutes (questions should be answerable in this time)`
      : "",
    `Difficulty: ${req.difficulty}`,
    `Question types to use: ${questionTypesLabel(req.questionTypes)}`,
    req.additionalInstructions
      ? `Additional instructions from the teacher:\n${req.additionalInstructions}`
      : "",
    "",
    marksGuidance(req.totalMarks, req.questionCount),
    "",
    "Organize the questions into sections (for example Very Short Answer, Short Answer, Long Answer) so sections read naturally. Return JSON exactly like:",
    '{ "title": "string (short, e.g. Mathematics Unit Test — Grade 9)", "sections": [ { "name": "string", "instructions": "optional per-section instruction shown to students", "questions": [ { "text": "question text", "type": "one of: MCQ | Very Short Answer | Short Answer | Long Answer | Fill in the Blanks | True / False", "marks": number, "options": ["A. ...", "B. ...", "C. ...", "D. ..."], "answer": "brief teacher-facing expected answer / key (for MCQ give the correct option text)" } ] } ] }',
    "",
    "Rules:",
    "- \"options\" is REQUIRED for MCQ questions (usually 4), omit it for other types.",
    "- \"answer\" is internal for the teacher only — keep it brief.",
    '- Fill in the Blanks questions must include a blank in the text, e.g. "The chemical symbol for water is ______."',
    "- True / False questions must include the statement only.",
    '- Match the requested difficulty: easy questions are recall-level, hard questions require application and analysis. For "Mixed" blend difficulty across the paper.',
    "- The marks of every question in the whole paper must sum exactly to the requested total marks.",
    "- Question text must not repeat — no duplicate or near-duplicate questions.",
    "",
    "Return the JSON object now.",
  ]
    .filter((line) => line !== "")
    .join("\n");

  const userPrompt =
    previousProblems && previousProblems.length > 0
      ? userParts +
        `\n\nYour previous attempt was rejected for these reasons:\n- ` +
        previousProblems.slice(0, 5).join("\n- ") +
        `\nFix every listed issue and return corrected JSON only.`
      : userParts;

  return { system, user: userPrompt };
}

// ---------------------------------------------------------------------------
// Parse + normalize the model's raw output into structured content
// ---------------------------------------------------------------------------

export type AiQuestion = {
  number: number;
  text: string;
  type: string;
  marks: number;
  options?: string[];
  answer?: string;
};

export type AiSection = {
  name: string;
  instructions?: string;
  questions: AiQuestion[];
};

const TYPE_KEYS = AI_QUESTION_TYPE_VALUES.map((t) =>
  t.toLowerCase().replace(/[^a-z]/g, ""),
);

export function normalizeAiType(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const key = raw.trim().toLowerCase().replace(/[^a-z]/g, "");
  const idx = TYPE_KEYS.indexOf(key);
  return idx >= 0 ? AI_QUESTION_TYPE_VALUES[idx] : null;
}

/** Extract the first top-level JSON object from a model reply. */
export function extractJson(raw: string): unknown {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("no JSON object found");
  return JSON.parse(text.slice(start, end + 1));
}

export type NormalizedOutput = { title: string; sections: AiSection[] };

/**
 * Validate + normalize raw AI output into typed sections. Throws with a
 * concrete list of problems when the output is unusable (never silently
 * drops or fabricates questions). Mark/count totals are intentionally NOT
 * fatal here — callers report exact mismatches instead of pretending.
 */
export function normalizeAiOutput(
  rawText: string,
  req: GenerateRequest,
): NormalizedOutput {
  let raw: unknown;
  try {
    raw = extractJson(rawText);
  } catch (err) {
    throw new Error(
      `The AI response was not valid JSON (${err instanceof Error ? err.message : "parse error"}).`,
    );
  }
  if (typeof raw !== "object" || raw === null || Array.isArray(raw))
    throw new Error("The AI response was not a JSON object.");

  const obj = raw as Record<string, unknown>;
  const title =
    typeof obj.title === "string" && obj.title.trim()
      ? clean(obj.title).slice(0, 200)
      : `${req.examType} — ${req.subject}, ${req.classGrade}`;
  const rawSections = obj.sections;

  const sections: AiSection[] = [];
  const problems: string[] = [];

  if (!Array.isArray(rawSections) || rawSections.length === 0) {
    throw new Error("The AI response contained no sections.");
  }

  let globalNumber = 0;
  rawSections.forEach((rawSection, sectionIdx) => {
    if (typeof rawSection !== "object" || rawSection === null) {
      problems.push(`Section ${sectionIdx + 1} is malformed.`);
      return;
    }
    const sec = rawSection as Record<string, unknown>;
    const name =
      typeof sec.name === "string" && sec.name.trim()
        ? clean(sec.name).slice(0, 200)
        : `Section ${sectionIdx + 1}`;
    const instructions =
      typeof sec.instructions === "string" && sec.instructions.trim()
        ? sec.instructions.trim().slice(0, 1000)
        : undefined;
    const rawQuestions = sec.questions;
    const questions: AiQuestion[] = [];

    if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
      problems.push(`Section "${name}" contains no questions.`);
    } else {
      rawQuestions.forEach((rawQ) => {
        globalNumber += 1;
        const n = globalNumber;
        if (typeof rawQ !== "object" || rawQ === null) {
          problems.push(`Question ${n} is malformed.`);
          return;
        }
        const q = rawQ as Record<string, unknown>;
        const text = typeof q.text === "string" ? q.text.trim() : "";
        if (!text) {
          problems.push(`Question ${n} has empty text.`);
          return;
        }
        const type = normalizeAiType(q.type);
        if (!type) {
          problems.push(
            `Question ${n} uses unsupported type "${String(q.type ?? "")}". Allowed types: ${AI_QUESTION_TYPE_VALUES.join(", ")}.`,
          );
          return;
        }
        const marks = Number(q.marks);
        if (!Number.isFinite(marks) || !Number.isInteger(marks) || marks <= 0) {
          problems.push(`Question ${n} must have a positive whole-number mark value.`);
          return;
        }
        let options: string[] | undefined;
        if (type === "MCQ") {
          const rawOptions = q.options;
          if (!Array.isArray(rawOptions)) {
            problems.push(`Question ${n} is an MCQ but has no options.`);
            return;
          }
          options = rawOptions
            .filter((o): o is string => typeof o === "string")
            .map((o) => o.trim())
            .filter(Boolean);
          if (options.length < 2 || options.length > 8) {
            problems.push(`Question ${n} must have between 2 and 8 MCQ options.`);
            return;
          }
        }
        const answer =
          typeof q.answer === "string" && q.answer.trim()
            ? q.answer.trim().slice(0, 2000)
            : undefined;

        questions.push({
          number: n,
          text: text.slice(0, 4000),
          type,
          marks,
          ...(options ? { options } : {}),
          ...(answer ? { answer } : {}),
        });
      });
    }
    if (questions.length > 0) {
      sections.push({
        name,
        ...(instructions ? { instructions } : {}),
        questions,
      });
    }
  });

  if (problems.length > 0) {
    throw new Error(problems.slice(0, 8).join(" "));
  }
  if (globalNumber === 0) {
    throw new Error("The AI produced no questions. Try generating again.");
  }
  return { title, sections };
}

export function contentMarks(sections: AiSection[]): number {
  return sections.reduce(
    (sum, s) => sum + s.questions.reduce((qsum, q) => qsum + q.marks, 0),
    0,
  );
}

export function contentQuestionCount(sections: AiSection[]): number {
  return sections.reduce((sum, s) => sum + s.questions.length, 0);
}

export function reviewNotes(
  req: GenerateRequest,
  actualMarks: number,
  actualQuestions: number,
): string[] {
  const notes: string[] = [];
  if (actualMarks !== req.totalMarks)
    notes.push(
      `Marks don't match: the generated questions total ${actualMarks} but you asked for ${req.totalMarks}.`,
    );
  if (actualQuestions !== req.questionCount)
    notes.push(
      `Question count differs: the paper has ${actualQuestions} questions but you asked for ${req.questionCount}.`,
    );
  return notes;
}

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

async function requireAuth(ctx: QueryCtx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Not authenticated");
  return userId;
}

async function logActivity(
  ctx: Pick<MutationCtx, "db">,
  userId: Id<"users">,
  action: string,
  entityId: Id<"aiGeneratedPapers"> | undefined,
  summary: string,
) {
  await ctx.db.insert("activities", {
    userId,
    action,
    entityType: "ai_paper",
    entityId,
    summary,
  });
}

type PaperDoc = Doc<"aiGeneratedPapers">;

async function requireOwnedPaper(
  ctx: QueryCtx,
  paperId: Id<"aiGeneratedPapers">,
): Promise<{ userId: Id<"users">; paper: PaperDoc }> {
  const userId = await requireAuth(ctx);
  const paper = await ctx.db.get(paperId);
  if (!paper) throw new Error("AI question paper not found");
  if (paper.userId !== userId) throw new Error("Not authorized");
  return { userId, paper };
}

// ---------------------------------------------------------------------------
// Persistence (save / list / view / status / delete)
// ---------------------------------------------------------------------------

/** Semantic content checks applied before anything reaches the database. */
function validateContentForSave(content: AiSection[]): void {
  if (!Array.isArray(content) || content.length === 0)
    throw new Error("Generated content has no sections to save.");
  const totalQ = contentQuestionCount(content);
  if (totalQ === 0) throw new Error("Generated content has no questions to save.");
  const seenTexts = new Set<string>();
  for (const section of content) {
    if (!section.name?.trim()) throw new Error("Every section needs a name.");
    for (const q of section.questions) {
      if (!q.text?.trim()) throw new Error("A question has empty text.");
      const type = normalizeAiType(q.type);
      if (!type) throw new Error(`Unsupported question type "${q.type}".`);
      if (!Number.isInteger(q.marks) || q.marks <= 0)
        throw new Error(
          `Question ${q.number ?? ""} needs positive whole-number marks.`,
        );
      if (type === "MCQ") {
        if (!Array.isArray(q.options) || q.options.length < 2)
          throw new Error(`MCQ "${q.text.slice(0, 60)}" has no answer options.`);
      }
      const key = q.text.trim().toLowerCase();
      if (seenTexts.has(key))
        throw new Error(
          "Duplicate question text detected — remove duplicates before saving.",
        );
      seenTexts.add(key);
    }
  }
}

export const saveAiPaper = mutation({
  args: { input: aiPaperSaveValidator },
  handler: async (ctx, { input }): Promise<Id<"aiGeneratedPapers">> => {
    const userId = await requireAuth(ctx);
    // Re-validate the human-entered requirements (same rules as generation).
    validateGenerateRequest({
      subject: input.subject,
      classGrade: input.classGrade,
      section: input.section,
      examType: input.examType,
      topics: input.topics,
      totalMarks: input.totalMarksRequested,
      questionCount: input.questionCountRequested,
      durationMinutes: input.durationMinutes,
      difficulty: input.difficulty,
      questionTypes: input.questionTypes,
      additionalInstructions: input.additionalInstructions,
    });
    validateContentForSave(input.content);

    const now = Date.now();
    const paperId = await ctx.db.insert("aiGeneratedPapers", {
      userId,
      title:
        clean(input.title) || `${input.examType} — ${input.subject}, ${input.classGrade}`,
      subject: input.subject,
      classGrade: input.classGrade,
      section: input.section?.trim() || undefined,
      examType: input.examType,
      topics: input.topics.trim(),
      durationMinutes: input.durationMinutes ?? undefined,
      difficulty: input.difficulty,
      questionTypes: [...input.questionTypes],
      additionalInstructions: input.additionalInstructions || undefined,
      totalMarksRequested: input.totalMarksRequested,
      questionCountRequested: input.questionCountRequested,
      content: input.content,
      status: "draft",
      updatedAt: now,
    });

    await logActivity(
      ctx,
      userId,
      "created",
      paperId,
      `AI question paper generated and saved — "${clean(input.title)}"`,
    );
    return paperId;
  },
});

export const updateAiPaperStatus = mutation({
  args: { paperId: v.id("aiGeneratedPapers"), status: v.string() },
  handler: async (ctx, { paperId, status }) => {
    const { userId, paper } = await requireOwnedPaper(ctx, paperId);
    if (!AI_PAPER_STATUS_VALUES.includes(status as never))
      throw new Error("Invalid status");
    if (status === paper.status) return;

    await ctx.db.patch(paperId, { status, updatedAt: Date.now() });
    await logActivity(
      ctx,
      userId,
      "updated",
      paperId,
      status === "ready"
        ? `Marked AI question paper "${paper.title}" as Ready`
        : `Reopened AI question paper "${paper.title}" as Draft`,
    );
  },
});

export const deleteAiPaper = mutation({
  args: { paperId: v.id("aiGeneratedPapers") },
  handler: async (ctx, { paperId }) => {
    const { userId, paper } = await requireOwnedPaper(ctx, paperId);
    await ctx.db.delete(paperId);
    await logActivity(
      ctx,
      userId,
      "deleted",
      undefined,
      `Deleted AI question paper "${paper.title}"`,
    );
  },
});

/** Light metadata for the saved-papers list (never loads question content). */
export const listAiPaperMeta = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    const papers = await ctx.db
      .query("aiGeneratedPapers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return papers
      .map((p) => ({
        _id: p._id,
        _creationTime: p._creationTime,
        title: p.title,
        subject: p.subject,
        classGrade: p.classGrade,
        section: p.section,
        examType: p.examType,
        difficulty: p.difficulty,
        topics: p.topics,
        durationMinutes: p.durationMinutes,
        status: p.status,
        totalMarksRequested: p.totalMarksRequested,
        questionCountRequested: p.questionCountRequested,
        updatedAt: p.updatedAt,
      }))
      .sort(
        (a, b) =>
          (b.updatedAt ?? b._creationTime) - (a.updatedAt ?? a._creationTime),
      );
  },
});

export type AiPaperMeta = {
  _id: Id<"aiGeneratedPapers">;
  _creationTime: number;
  title: string;
  subject: string;
  classGrade: string;
  section?: string;
  examType: string;
  difficulty: string;
  topics: string;
  durationMinutes?: number;
  status: string;
  totalMarksRequested: number;
  questionCountRequested: number;
  updatedAt?: number;
};

/** Full paper (with content) for one owned record — opened one at a time. */
export const getAiPaper = query({
  args: { paperId: v.id("aiGeneratedPapers") },
  handler: async (ctx, { paperId }) => {
    const { paper } = await requireOwnedPaper(ctx, paperId);
    const { userId: _userId, ...rest } = paper;
    return rest;
  },
});

/** Counts for the Question Papers page entry + dashboard integration. */
export const aiPaperSummary = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    const papers = await ctx.db
      .query("aiGeneratedPapers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return {
      total: papers.length,
      draft: papers.filter((p) => p.status === "draft").length,
      ready: papers.filter((p) => p.status === "ready").length,
    };
  },
});
