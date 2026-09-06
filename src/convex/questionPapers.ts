import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import {
  QUESTION_PAPER_PRIORITY_VALUES,
  QUESTION_PAPER_STATUS_VALUES,
  questionPaperInputValidator,
  questionPaperUpdateValidator,
} from "./validators";

async function requireAuth(ctx: QueryCtx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Not authenticated");
  return userId;
}

/** Verify the user is authenticated and owns the given paper. Throws otherwise. */
async function requireOwnedPaper(
  ctx: QueryCtx,
  paperId: Id<"questionPapers">,
): Promise<{ userId: Id<"users">; paper: Doc<"questionPapers"> }> {
  const userId = await requireAuth(ctx);
  const paper = await ctx.db.get(paperId);
  if (!paper) throw new Error("Question paper not found");
  if (paper.userId !== userId) throw new Error("Not authorized");
  return { userId, paper };
}

/** Records an entry in the shared activity history (same table other modules use). */
async function logActivity(
  ctx: Pick<MutationCtx, "db">,
  userId: Id<"users">,
  action: string,
  entityType: string,
  entityId: Id<"questionPapers"> | undefined,
  summary: string,
) {
  await ctx.db.insert("activities", {
    userId,
    action,
    entityType,
    entityId,
    summary,
  });
}

/** YYYY-MM-DD for the server's local calendar date. */
function todayStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/** YYYY-MM-DD for `offset` days from today (negative = past). */
function dateStrWithOffset(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isDateStr(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** Positive whole-number validation for optional numeric fields. */
function validateOptionalPositive(value: number | undefined, label: string) {
  if (value === undefined || value === null) return;
  if (!Number.isInteger(value) || value <= 0)
    throw new Error(`${label} must be a positive whole number`);
}

function validateQuestionPaperFields(input: {
  title: string;
  subject: string;
  classGrade: string;
  examType: string;
  examDate?: string;
  preparationDeadline?: string;
  durationMinutes?: number;
  totalMarks?: number;
  questionCount?: number;
  status: string;
  priority: string;
}) {
  if (!input.title.trim()) throw new Error("Paper title is required");
  if (input.title.length > 200) throw new Error("Paper title is too long");
  if (!input.subject.trim()) throw new Error("Subject is required");
  if (input.subject.length > 120) throw new Error("Subject is too long");
  if (!input.classGrade.trim()) throw new Error("Class / grade is required");
  if (input.classGrade.length > 120) throw new Error("Class / grade is too long");
  if (!input.examType.trim()) throw new Error("Exam type is required");
  if (input.examType.length > 120) throw new Error("Exam type is too long");
  if (input.examDate !== undefined && input.examDate !== null && !isDateStr(input.examDate))
    throw new Error("Exam date must be a valid date");
  if (
    input.preparationDeadline !== undefined &&
    input.preparationDeadline !== null &&
    !isDateStr(input.preparationDeadline)
  )
    throw new Error("Preparation deadline must be a valid date");
  if (
    input.examDate &&
    input.preparationDeadline &&
    input.preparationDeadline > input.examDate
  )
    throw new Error("Preparation deadline should be before the exam date");
  validateOptionalPositive(input.durationMinutes, "Duration");
  validateOptionalPositive(input.totalMarks, "Total marks");
  validateOptionalPositive(input.questionCount, "Question count");
  if (!QUESTION_PAPER_STATUS_VALUES.includes(input.status as never))
    throw new Error("Invalid status");
  if (!QUESTION_PAPER_PRIORITY_VALUES.includes(input.priority as never))
    throw new Error("Invalid priority");
}

/** Shape returned to the client. */
export type QuestionPaperRecord = Omit<Doc<"questionPapers">, "userId"> & {
  _id: Id<"questionPapers">;
};

export const listQuestionPapers = query({
  args: {},
  handler: async (ctx): Promise<QuestionPaperRecord[]> => {
    const userId = await requireAuth(ctx);
    const papers = await ctx.db
      .query("questionPapers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return papers.map(({ userId: _userId, ...rest }) => rest);
  },
});

export const getQuestionPaper = query({
  args: { paperId: v.id("questionPapers") },
  handler: async (ctx, { paperId }): Promise<QuestionPaperRecord | null> => {
    const { paper } = await requireOwnedPaper(ctx, paperId);
    const { userId: _userId, ...rest } = paper;
    return rest;
  },
});

export const createQuestionPaper = mutation({
  args: { input: questionPaperInputValidator },
  handler: async (ctx, { input }): Promise<Id<"questionPapers">> => {
    const userId = await requireAuth(ctx);
    validateQuestionPaperFields(input);

    const now = Date.now();
    const paperId = await ctx.db.insert("questionPapers", {
      userId,
      title: input.title.trim(),
      subject: input.subject.trim(),
      classGrade: input.classGrade.trim(),
      section: input.section?.trim() || undefined,
      examType: input.examType.trim(),
      examDate: input.examDate || undefined,
      preparationDeadline: input.preparationDeadline || undefined,
      durationMinutes: input.durationMinutes ?? undefined,
      totalMarks: input.totalMarks ?? undefined,
      status: input.status,
      priority: input.priority,
      syllabusTopics: input.syllabusTopics?.trim() || undefined,
      questionCount: input.questionCount ?? undefined,
      notes: input.notes?.trim() || undefined,
      completedAt: input.status === "completed" ? now : undefined,
      updatedAt: now,
    });

    await logActivity(
      ctx,
      userId,
      "created",
      "question_paper",
      paperId,
      `Created question paper "${input.title.trim()}"`,
    );
    return paperId;
  },
});

export const updateQuestionPaper = mutation({
  args: { paperId: v.id("questionPapers"), patch: questionPaperUpdateValidator },
  handler: async (ctx, { paperId, patch }) => {
    const { userId, paper } = await requireOwnedPaper(ctx, paperId);

    const clean: Partial<Doc<"questionPapers">> = {};
    if (patch.title !== undefined) {
      const t = patch.title.trim();
      if (!t) throw new Error("Paper title is required");
      clean.title = t;
    }
    if (patch.subject !== undefined) {
      const s = patch.subject.trim();
      if (!s) throw new Error("Subject is required");
      clean.subject = s;
    }
    if (patch.classGrade !== undefined) {
      const c = patch.classGrade.trim();
      if (!c) throw new Error("Class / grade is required");
      clean.classGrade = c;
    }
    if (patch.section !== undefined)
      clean.section = patch.section?.trim() || undefined;
    if (patch.examType !== undefined) {
      const e = patch.examType.trim();
      if (!e) throw new Error("Exam type is required");
      clean.examType = e;
    }
    if (patch.examDate !== undefined)
      clean.examDate = patch.examDate || undefined;
    if (patch.preparationDeadline !== undefined)
      clean.preparationDeadline = patch.preparationDeadline || undefined;
    if (patch.durationMinutes !== undefined)
      clean.durationMinutes = patch.durationMinutes ?? undefined;
    if (patch.totalMarks !== undefined)
      clean.totalMarks = patch.totalMarks ?? undefined;
    if (patch.questionCount !== undefined)
      clean.questionCount = patch.questionCount ?? undefined;
    if (patch.syllabusTopics !== undefined)
      clean.syllabusTopics = patch.syllabusTopics?.trim() || undefined;
    if (patch.notes !== undefined)
      clean.notes = patch.notes?.trim() || undefined;
    if (patch.priority !== undefined) {
      if (!QUESTION_PAPER_PRIORITY_VALUES.includes(patch.priority as never))
        throw new Error("Invalid priority");
      clean.priority = patch.priority;
    }
    if (patch.status !== undefined) {
      if (!QUESTION_PAPER_STATUS_VALUES.includes(patch.status as never))
        throw new Error("Invalid status");
      clean.status = patch.status;
      clean.completedAt =
        patch.status === "completed"
          ? (paper.completedAt ?? Date.now())
          : undefined;
    }

    // Re-validate date ordering against the merged values.
    const examDate = clean.examDate ?? paper.examDate;
    const prepDeadline =
      clean.preparationDeadline ?? paper.preparationDeadline;
    if (examDate && prepDeadline && prepDeadline > examDate)
      throw new Error("Preparation deadline should be before the exam date");
    validateOptionalPositive(clean.durationMinutes ?? paper.durationMinutes, "Duration");
    validateOptionalPositive(clean.totalMarks ?? paper.totalMarks, "Total marks");
    validateOptionalPositive(clean.questionCount ?? paper.questionCount, "Question count");

    clean.updatedAt = Date.now();
    await ctx.db.patch(paperId, clean);

    const label = clean.title ?? paper.title;
    const statusChanged = clean.status !== undefined && clean.status !== paper.status;
    if (statusChanged && clean.status === "completed") {
      await logActivity(
        ctx,
        userId,
        "completed",
        "question_paper",
        paperId,
        `Completed question paper "${label}"`,
      );
    } else if (statusChanged) {
      const statusLabel = QUESTION_PAPER_STATUS_LABELS[
        clean.status as (typeof QUESTION_PAPER_STATUS_VALUES)[number]
      ];
      await logActivity(
        ctx,
        userId,
        "updated",
        "question_paper",
        paperId,
        `Changed status of "${label}" to ${statusLabel}`,
      );
    } else {
      await logActivity(
        ctx,
        userId,
        "updated",
        "question_paper",
        paperId,
        `Updated question paper "${label}"`,
      );
    }
  },
});

export const deleteQuestionPaper = mutation({
  args: { paperId: v.id("questionPapers") },
  handler: async (ctx, { paperId }) => {
    const { userId, paper } = await requireOwnedPaper(ctx, paperId);
    await ctx.db.delete(paperId);
    await logActivity(
      ctx,
      userId,
      "deleted",
      "question_paper",
      undefined,
      `Deleted question paper "${paper.title}"`,
    );
  },
});

const QUESTION_PAPER_STATUS_LABELS: Record<string, string> = {
  not_started: "Not Started",
  draft: "Draft",
  ready: "Ready",
  completed: "Completed",
};

/**
 * Server-computed question-paper summary for the dashboard: preparation
 * attention counts, draft/ready workload, and the next upcoming exam.
 */
export const getQuestionPaperSummary = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    const papers = await ctx.db
      .query("questionPapers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const today = todayStr();
    const soonEnd = dateStrWithOffset(3);
    const examSoonEnd = dateStrWithOffset(7);

    const shape = (p: Doc<"questionPapers">) => {
      const { userId: _userId, ...rest } = p;
      return rest;
    };

    const open = papers.filter((p) => p.status !== "completed");
    const overdue = open.filter(
      (p) => p.preparationDeadline && p.preparationDeadline < today,
    );
    const dueToday = open.filter(
      (p) => p.preparationDeadline === today,
    );
    const dueSoon = open.filter(
      (p) => p.preparationDeadline && p.preparationDeadline > today && p.preparationDeadline <= soonEnd,
    );
    const upcomingExams = open.filter(
      (p) => p.examDate && p.examDate > today && p.examDate <= examSoonEnd,
    );

    // Deterministic attention: overdue prep → due today → due soon →
    // priority → soonest exam date.
    const priorityRank: Record<string, number> = {
      urgent: 0,
      high: 1,
      medium: 2,
      low: 3,
    };
    const attention = [...open]
      .sort((a, b) => {
        const bucketOf = (p: Doc<"questionPapers">) =>
          p.preparationDeadline && p.preparationDeadline < today
            ? 0
            : p.preparationDeadline === today
              ? 1
              : p.preparationDeadline && p.preparationDeadline <= soonEnd
                ? 2
                : 3;
        const ao = bucketOf(a);
        const bo = bucketOf(b);
        if (ao !== bo) return ao - bo;
        const ap = priorityRank[a.priority] ?? 2;
        const bp = priorityRank[b.priority] ?? 2;
        if (ap !== bp) return ap - bp;
        const aExam = a.examDate ?? "9999-12-31";
        const bExam = b.examDate ?? "9999-12-31";
        if (aExam !== bExam) return aExam < bExam ? -1 : 1;
        return a._creationTime - b._creationTime;
      })
      .slice(0, 3)
      .map(shape);

    const withExamDate = open
      .filter((p) => p.examDate && p.examDate >= today)
      .sort((a, b) => (a.examDate! < b.examDate! ? -1 : 1));
    const nextExam = withExamDate[0] ?? null;

    return {
      total: papers.length,
      notStarted: papers.filter((p) => p.status === "not_started").length,
      draft: papers.filter((p) => p.status === "draft").length,
      ready: papers.filter((p) => p.status === "ready").length,
      completed: papers.filter((p) => p.status === "completed").length,
      active: open.length,
      overdue: overdue.length,
      dueToday: dueToday.length,
      dueSoon: dueSoon.length,
      upcomingExams: upcomingExams.length,
      nextExam: nextExam ? shape(nextExam) : null,
      attention,
    };
  },
});