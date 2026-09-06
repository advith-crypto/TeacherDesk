import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import {
  CORRECTION_PRIORITY_VALUES,
  correctionInputValidator,
  correctionUpdateValidator,
} from "./validators";

async function requireAuth(ctx: QueryCtx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Not authenticated");
  return userId;
}

/** Verify the user is authenticated and owns the given correction. Throws otherwise. */
async function requireOwnedCorrection(
  ctx: QueryCtx,
  correctionId: Id<"corrections">,
): Promise<{ userId: Id<"users">; correction: Doc<"corrections"> }> {
  const userId = await requireAuth(ctx);
  const correction = await ctx.db.get(correctionId);
  if (!correction) throw new Error("Correction not found");
  if (correction.userId !== userId) throw new Error("Not authorized");
  return { userId, correction };
}

/** Records an entry in the shared activity history (same table tasks/lessons use). */
async function logActivity(
  ctx: Pick<MutationCtx, "db">,
  userId: Id<"users">,
  action: string,
  entityType: string,
  entityId: Id<"corrections"> | undefined,
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

/**
 * Status is always derived from progress — never stored independently:
 * 0 corrected → Not Started; partially → In Progress; all → Completed.
 */
export function deriveCorrectionStatus(
  correctedPapers: number,
  totalPapers: number,
): "not_started" | "in_progress" | "completed" {
  if (totalPapers > 0 && correctedPapers >= totalPapers) return "completed";
  if (correctedPapers > 0) return "in_progress";
  return "not_started";
}

/** Validate paper counts. correctedPapers is always clamped by totalPapers. */
function validatePapers(totalPapers: number, correctedPapers: number) {
  if (!Number.isInteger(totalPapers) || totalPapers <= 0)
    throw new Error("Total papers must be a positive whole number");
  if (!Number.isInteger(correctedPapers) || correctedPapers < 0)
    throw new Error("Corrected papers cannot be negative");
  if (correctedPapers > totalPapers)
    throw new Error("Corrected papers cannot exceed total papers");
}

function validateCorrectionFields(input: {
  title: string;
  subject: string;
  classGrade: string;
  assessmentType: string;
  correctionDeadline: string;
  totalPapers: number;
  correctedPapers: number;
  priority: string;
}) {
  if (!input.title.trim()) throw new Error("Correction title is required");
  if (input.title.length > 200) throw new Error("Correction title is too long");
  if (!input.subject.trim()) throw new Error("Subject is required");
  if (input.subject.length > 120) throw new Error("Subject is too long");
  if (!input.classGrade.trim()) throw new Error("Class / grade is required");
  if (input.classGrade.length > 120) throw new Error("Class / grade is too long");
  if (!input.assessmentType.trim()) throw new Error("Assessment type is required");
  if (input.assessmentType.length > 120)
    throw new Error("Assessment type is too long");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.correctionDeadline))
    throw new Error("Correction deadline is required");
  validatePapers(input.totalPapers, input.correctedPapers);
  if (!CORRECTION_PRIORITY_VALUES.includes(input.priority as never))
    throw new Error("Invalid priority");
}

/** Shape returned to the client. */
export type CorrectionRecord = Omit<Doc<"corrections">, "userId"> & {
  _id: Id<"corrections">;
};

export const listCorrections = query({
  args: {},
  handler: async (ctx): Promise<CorrectionRecord[]> => {
    const userId = await requireAuth(ctx);
    const corrections = await ctx.db
      .query("corrections")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return corrections.map(({ userId: _userId, ...rest }) => rest);
  },
});

export const getCorrection = query({
  args: { correctionId: v.id("corrections") },
  handler: async (ctx, { correctionId }): Promise<CorrectionRecord | null> => {
    const { correction } = await requireOwnedCorrection(ctx, correctionId);
    const { userId: _userId, ...rest } = correction;
    return rest;
  },
});

export const createCorrection = mutation({
  args: { input: correctionInputValidator },
  handler: async (ctx, { input }): Promise<Id<"corrections">> => {
    const userId = await requireAuth(ctx);
    const correctedPapers = input.correctedPapers ?? 0;
    validateCorrectionFields({
      title: input.title,
      subject: input.subject,
      classGrade: input.classGrade,
      assessmentType: input.assessmentType,
      correctionDeadline: input.correctionDeadline,
      totalPapers: input.totalPapers,
      correctedPapers,
      priority: input.priority,
    });

    const now = Date.now();
    const status = deriveCorrectionStatus(correctedPapers, input.totalPapers);
    const correctionId = await ctx.db.insert("corrections", {
      userId,
      title: input.title.trim(),
      subject: input.subject.trim(),
      classGrade: input.classGrade.trim(),
      section: input.section?.trim() || undefined,
      assessmentType: input.assessmentType.trim(),
      assessmentDate: input.assessmentDate || undefined,
      correctionDeadline: input.correctionDeadline,
      totalPapers: input.totalPapers,
      correctedPapers,
      notes: input.notes?.trim() || undefined,
      priority: input.priority,
      status,
      completedAt: status === "completed" ? now : undefined,
      updatedAt: now,
    });

    await logActivity(
      ctx,
      userId,
      "created",
      "correction",
      correctionId,
      `Created correction "${input.title.trim()}" (${correctedPapers}/${input.totalPapers} corrected)`,
    );
    return correctionId;
  },
});

export const updateCorrection = mutation({
  args: { correctionId: v.id("corrections"), patch: correctionUpdateValidator },
  handler: async (ctx, { correctionId, patch }) => {
    const { userId, correction } = await requireOwnedCorrection(ctx, correctionId);

    const clean: Partial<Doc<"corrections">> = {};
    if (patch.title !== undefined) {
      const t = patch.title.trim();
      if (!t) throw new Error("Correction title is required");
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
    if (patch.assessmentType !== undefined) {
      const a = patch.assessmentType.trim();
      if (!a) throw new Error("Assessment type is required");
      clean.assessmentType = a;
    }
    if (patch.assessmentDate !== undefined)
      clean.assessmentDate = patch.assessmentDate || undefined;
    if (patch.correctionDeadline !== undefined) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(patch.correctionDeadline))
        throw new Error("Correction deadline is required");
      clean.correctionDeadline = patch.correctionDeadline;
    }
    if (patch.notes !== undefined)
      clean.notes = patch.notes?.trim() || undefined;
    if (patch.priority !== undefined) {
      if (!CORRECTION_PRIORITY_VALUES.includes(patch.priority as never))
        throw new Error("Invalid priority");
      clean.priority = patch.priority;
    }

    // Progress edits recompute the derived status + completedAt so the record
    // can never disagree with its numbers.
    const nextTotal = patch.totalPapers ?? correction.totalPapers;
    const nextCorrected = patch.correctedPapers ?? correction.correctedPapers;
    if (patch.totalPapers !== undefined || patch.correctedPapers !== undefined) {
      validatePapers(nextTotal, nextCorrected);
      clean.totalPapers = nextTotal;
      clean.correctedPapers = nextCorrected;
      const status = deriveCorrectionStatus(nextCorrected, nextTotal);
      clean.status = status;
      clean.completedAt =
        status === "completed"
          ? (correction.completedAt ?? Date.now())
          : undefined;
    }

    clean.updatedAt = Date.now();

    await ctx.db.patch(correctionId, clean);
    const label = clean.title ?? correction.title;
    const becameCompleted =
      clean.status === "completed" && correction.status !== "completed";
    await logActivity(
      ctx,
      userId,
      becameCompleted ? "completed" : "updated",
      "correction",
      correctionId,
      becameCompleted
        ? `Completed correction "${label}" — all ${nextTotal} papers done`
        : `Updated correction "${label}"`,
    );
  },
});

/** Quick +/- progress bump: clamps to [0, total] and derives status. */
export const updateCorrectionProgress = mutation({
  args: {
    correctionId: v.id("corrections"),
    correctedPapers: v.number(),
  },
  handler: async (ctx, { correctionId, correctedPapers }) => {
    const { userId, correction } = await requireOwnedCorrection(
      ctx,
      correctionId,
    );
    validatePapers(correction.totalPapers, correctedPapers);

    const status = deriveCorrectionStatus(
      correctedPapers,
      correction.totalPapers,
    );
    const now = Date.now();
    const becameCompleted = status === "completed" && correction.status !== "completed";

    await ctx.db.patch(correctionId, {
      correctedPapers,
      status,
      completedAt: status === "completed" ? (correction.completedAt ?? now) : undefined,
      updatedAt: now,
    });

    const remaining = correction.totalPapers - correctedPapers;
    await logActivity(
      ctx,
      userId,
      becameCompleted ? "completed" : "progress_changed",
      "correction",
      correctionId,
      becameCompleted
        ? `Completed correction "${correction.title}" — all ${correction.totalPapers} papers done`
        : `Updated correction progress for "${correction.title}" — ${correctedPapers}/${correction.totalPapers} corrected, ${remaining} remaining`,
    );
  },
});

export const deleteCorrection = mutation({
  args: { correctionId: v.id("corrections") },
  handler: async (ctx, { correctionId }) => {
    const { userId, correction } = await requireOwnedCorrection(
      ctx,
      correctionId,
    );
    await ctx.db.delete(correctionId);
    await logActivity(
      ctx,
      userId,
      "deleted",
      "correction",
      undefined,
      `Deleted correction "${correction.title}"`,
    );
  },
});

/**
 * Server-computed correction summary for the dashboard: remaining workload,
 * deadline attention counts, and the top active corrections by attention.
 */
export const getCorrectionSummary = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    const corrections = await ctx.db
      .query("corrections")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const today = todayStr();
    const soonEnd = dateStrWithOffset(3); // today+1 .. today+3 = due soon
    const weekStart = dateStrWithOffset(-6); // last 7 days incl. today

    const shape = (c: Doc<"corrections">) => {
      const { userId: _userId, ...rest } = c;
      return rest;
    };

    const active = corrections.filter((c) => c.status !== "completed");
    const papersRemaining = active.reduce(
      (sum, c) => sum + (c.totalPapers - c.correctedPapers),
      0,
    );
    const papersCorrected = corrections.reduce(
      (sum, c) => sum + c.correctedPapers,
      0,
    );
    const overdue = active.filter((c) => c.correctionDeadline < today);
    const dueToday = active.filter((c) => c.correctionDeadline === today);
    const dueSoon = active.filter(
      (c) => c.correctionDeadline > today && c.correctionDeadline <= soonEnd,
    );
    const completedThisWeek = corrections.filter(
      (c) => c.status === "completed" && (c.completedAt ?? 0) >= Date.now() - 7 * 86_400_000,
    );

    // Deterministic attention: overdue → due today → due soon → priority,
    // then fewest remaining papers first. Tasks stay primary on the dashboard;
    // this just ranks the corrections section itself.
    const priorityRank: Record<string, number> = {
      urgent: 0,
      high: 1,
      medium: 2,
      low: 3,
    };
    const attention = [...active]
      .sort((a, b) => {
        const ao = a.correctionDeadline < today ? 0 : a.correctionDeadline === today ? 1 : a.correctionDeadline <= soonEnd ? 2 : 3;
        const bo = b.correctionDeadline < today ? 0 : b.correctionDeadline === today ? 1 : b.correctionDeadline <= soonEnd ? 2 : 3;
        if (ao !== bo) return ao - bo;
        const ap = priorityRank[a.priority] ?? 2;
        const bp = priorityRank[b.priority] ?? 2;
        if (ap !== bp) return ap - bp;
        const ar = a.totalPapers - a.correctedPapers;
        const br = b.totalPapers - b.correctedPapers;
        if (ar !== br) return br - ar;
        return a._creationTime - b._creationTime;
      })
      .slice(0, 3)
      .map(shape);

    const sortedByDeadline = [...active].sort((a, b) =>
      a.correctionDeadline < b.correctionDeadline ? -1 : 1,
    );
    const mostUrgent = attention[0] ?? null;

    return {
      total: corrections.length,
      active: active.length,
      completed: corrections.length - active.length,
      papersRemaining,
      papersCorrected,
      papersCompletedThisWeek: completedThisWeek.reduce(
        (sum, c) => sum + c.totalPapers,
        0,
      ),
      overdue: overdue.length,
      dueToday: dueToday.length,
      dueSoon: dueSoon.length,
      nextDeadline: sortedByDeadline[0]?.correctionDeadline ?? null,
      mostUrgent,
      attention,
      weekStart,
    };
  },
});