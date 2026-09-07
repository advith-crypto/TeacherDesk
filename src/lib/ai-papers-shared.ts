// Shared AI Question Paper Generator domain values (Phase 3A) — single
// source of truth for the generator UI. Display strings are stored as-is so
// saved papers read naturally.

export const AI_DIFFICULTIES = ["Easy", "Medium", "Hard", "Mixed"] as const;
export type AiDifficulty = (typeof AI_DIFFICULTIES)[number];

/** Canonical question-type strings (must match src/convex/validators.ts). */
export const AI_QUESTION_TYPES = [
  "MCQ",
  "Very Short Answer",
  "Short Answer",
  "Long Answer",
  "Fill in the Blanks",
  "True / False",
] as const;
export type AiQuestionType = (typeof AI_QUESTION_TYPES)[number];

export const AI_PAPER_STATUSES = ["draft", "ready"] as const;
export type AiPaperStatus = (typeof AI_PAPER_STATUSES)[number];

export const AI_PAPER_STATUS_LABELS: Record<AiPaperStatus, string> = {
  draft: "Draft",
  ready: "Ready",
};

/** Compact type chips used when previewing a question. */
export const AI_QUESTION_TYPE_SHORT: Record<AiQuestionType, string> = {
  MCQ: "MCQ",
  "Very Short Answer": "V. Short",
  "Short Answer": "Short",
  "Long Answer": "Long",
  "Fill in the Blanks": "Fill blanks",
  "True / False": "T / F",
};

export const AI_MAX_MARKS = 1000;
export const AI_MAX_QUESTIONS = 80;

// --- Structured content shapes (mirror what the backend stores) ---

export type AiQuestion = {
  number: number;
  text: string;
  type: string; // one of AI_QUESTION_TYPES (kept string so saved docs flow through)
  marks: number;
  options?: string[];
  answer?: string; // teacher-facing only — never shown to students by default
};

export type AiSection = {
  name: string;
  instructions?: string;
  questions: AiQuestion[];
};

/** Marks summed from real question content (never stored redundantly). */
export function contentMarks(sections: AiSection[] | undefined): number {
  if (!sections) return 0;
  return sections.reduce(
    (sum, s) => sum + s.questions.reduce((qsum, q) => qsum + q.marks, 0),
    0,
  );
}

export function contentQuestionCount(sections: AiSection[] | undefined): number {
  if (!sections) return 0;
  return sections.reduce((sum, s) => sum + s.questions.length, 0);
}

/** Whole-paper stats derived from real content. */
export function paperStats(sections: AiSection[] | undefined): {
  totalMarks: number;
  questionCount: number;
} {
  return {
    totalMarks: contentMarks(sections),
    questionCount: contentQuestionCount(sections),
  };
}

export function formatDuration(minutes?: number): string | null {
  if (!minutes || minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} hr`;
  return `${h} hr ${m} min`;
}
