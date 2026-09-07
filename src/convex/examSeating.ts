import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import {
  EXAM_SEATING_STATUS_VALUES,
  examSeatingPlanInputValidator,
  examSeatingPlanUpdateValidator,
  examSeatingAssignmentUpdateValidator,
} from "./validators";

async function requireAuth(ctx: QueryCtx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Not authenticated");
  return userId;
}

/** Verify the user is authenticated and owns the given seating plan. Throws otherwise. */
async function requireOwnedPlan(
  ctx: QueryCtx,
  planId: Id<"examSeatingPlans">,
): Promise<{ userId: Id<"users">; plan: Doc<"examSeatingPlans"> }> {
  const userId = await requireAuth(ctx);
  const plan = await ctx.db.get(planId);
  if (!plan) throw new Error("Seating plan not found");
  if (plan.userId !== userId) throw new Error("Not authorized");
  return { userId, plan };
}

/** Verify the user owns the assignment AND its parent plan. Throws otherwise. */
async function requireOwnedAssignment(
  ctx: QueryCtx,
  assignmentId: Id<"examSeatingAssignments">,
): Promise<{
  userId: Id<"users">;
  plan: Doc<"examSeatingPlans">;
  assignment: Doc<"examSeatingAssignments">;
}> {
  const userId = await requireAuth(ctx);
  const assignment = await ctx.db.get(assignmentId);
  if (!assignment) throw new Error("Assignment not found");
  if (assignment.userId !== userId) throw new Error("Not authorized");
  const plan = await ctx.db.get(assignment.seatingPlanId);
  if (!plan || plan.userId !== userId) throw new Error("Seating plan not found");
  return { userId, plan, assignment };
}

/** Records an entry in the shared activity history (same table other modules use). */
async function logActivity(
  ctx: Pick<MutationCtx, "db">,
  userId: Id<"users">,
  action: string,
  entityType: string,
  entityId:
    | Id<"examSeatingPlans">
    | Id<"examSeatingAssignments">
    | undefined,
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

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Strict YYYY-MM-DD check: format plus a real calendar date (no rollovers). */
function isValidDateStr(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const d = new Date(value + "T00:00:00");
  if (Number.isNaN(d.getTime())) return false;
  return (
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` ===
    value
  );
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

const MAX_GRID_DIMENSION = 50;

function validateGrid(rows: number, columns: number) {
  if (!Number.isInteger(rows) || rows <= 0 || rows > MAX_GRID_DIMENSION)
    throw new Error(
      `Rows must be a positive whole number (max ${MAX_GRID_DIMENSION})`,
    );
  if (!Number.isInteger(columns) || columns <= 0 || columns > MAX_GRID_DIMENSION)
    throw new Error(
      `Columns must be a positive whole number (max ${MAX_GRID_DIMENSION})`,
    );
}

function validatePlanFields(input: {
  title: string;
  examName: string;
  examDate: string;
  startTime?: string;
  durationMinutes?: number;
  rows: number;
  columns: number;
  status: string;
}) {
  if (!input.title.trim()) throw new Error("Plan title is required");
  if (input.title.length > 200) throw new Error("Plan title is too long");
  if (!input.examName.trim()) throw new Error("Exam name is required");
  if (input.examName.length > 200) throw new Error("Exam name is too long");
  if (!isValidDateStr(input.examDate))
    throw new Error("Exam date must be a valid date (YYYY-MM-DD)");
  if (input.startTime !== undefined && !TIME_PATTERN.test(input.startTime))
    throw new Error("Start time must be a valid time in HH:MM format");
  if (
    input.durationMinutes !== undefined &&
    (!Number.isInteger(input.durationMinutes) || input.durationMinutes <= 0)
  )
    throw new Error("Duration must be a positive whole number");
  validateGrid(input.rows, input.columns);
  if (!EXAM_SEATING_STATUS_VALUES.includes(input.status as never))
    throw new Error("Invalid status");
}

function validateSeat(rows: number, columns: number, row: number, column: number) {
  if (!Number.isInteger(row) || row < 1 || row > rows)
    throw new Error(`Row must be a whole number between 1 and ${rows}`);
  if (!Number.isInteger(column) || column < 1 || column > columns)
    throw new Error(`Column must be a whole number between 1 and ${columns}`);
}

/** Student identifiers are trimmed on entry and compared case-insensitively. */
function normalizeIdentifier(value: string): string {
  return value.trim();
}

function sameIdentifier(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** \"R1C1\"-style seat label matching the visual grid. */
function seatLabel(row: number, column: number): string {
  return `R${row}C${column}`;
}

/**
 * Applies assignment-related plan patches and automatically reopens a
 * Completed plan (back to Draft, completedAt cleared) because the plan was
 * edited after completion. Called from every assignment mutation.
 */
async function patchPlanAfterAssignmentChange(
  ctx: Pick<MutationCtx, "db">,
  plan: Doc<"examSeatingPlans">,
  changes: Partial<Doc<"examSeatingPlans">>,
) {
  await ctx.db.patch(plan._id, {
    ...changes,
    status: plan.status === "completed" ? "draft" : plan.status,
    completedAt: plan.status === "completed" ? undefined : plan.completedAt,
    updatedAt: Date.now(),
  });
}

/** Shape returned to the client. */
export type SeatingPlanRecord = Omit<Doc<"examSeatingPlans">, "userId"> & {
  _id: Id<"examSeatingPlans">;
};

export type SeatingAssignmentRecord = Omit<
  Doc<"examSeatingAssignments">,
  "userId"
> & {
  _id: Id<"examSeatingAssignments">;
};

export const listSeatingPlans = query({
  args: {},
  handler: async (ctx): Promise<SeatingPlanRecord[]> => {
    const userId = await requireAuth(ctx);
    const plans = await ctx.db
      .query("examSeatingPlans")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return plans.map(({ userId: _userId, ...rest }) => rest);
  },
});

export const getSeatingPlan = query({
  args: { planId: v.id("examSeatingPlans") },
  handler: async (ctx, { planId }): Promise<SeatingPlanRecord | null> => {
    const { plan } = await requireOwnedPlan(ctx, planId);
    const { userId: _userId, ...rest } = plan;
    return rest;
  },
});

/**
 * Plan detail for the seating grid. Loads the plan plus only that plan's
 * assignments — never every assignment across all plans.
 */
export const getSeatingPlanDetail = query({
  args: { planId: v.id("examSeatingPlans") },
  handler: async (
    ctx,
    { planId },
  ): Promise<{ plan: SeatingPlanRecord; assignments: SeatingAssignmentRecord[] }> => {
    const { plan } = await requireOwnedPlan(ctx, planId);
    const assignments = await ctx.db
      .query("examSeatingAssignments")
      .withIndex("by_seating_plan", (q) => q.eq("seatingPlanId", planId))
      .collect();
    const { userId: _userId, ...planRest } = plan;
    return {
      plan: planRest,
      assignments: assignments.map(({ userId: _u, ...rest }) => rest),
    };
  },
});

export const createSeatingPlan = mutation({
  args: { input: examSeatingPlanInputValidator },
  handler: async (ctx, { input }): Promise<Id<"examSeatingPlans">> => {
    const userId = await requireAuth(ctx);
    const status = input.status ?? "draft";
    validatePlanFields({ ...input, status });

    const now = Date.now();
    const rows = input.rows;
    const columns = input.columns;
    const planId = await ctx.db.insert("examSeatingPlans", {
      userId,
      title: input.title.trim(),
      examName: input.examName.trim(),
      examDate: input.examDate,
      startTime: input.startTime || undefined,
      durationMinutes: input.durationMinutes ?? undefined,
      room: input.room?.trim() || undefined,
      rows,
      columns,
      notes: input.notes?.trim() || undefined,
      status,
      assignedCount: 0,
      completedAt: undefined,
      updatedAt: now,
    });

    await logActivity(
      ctx,
      userId,
      "created",
      "exam_seating",
      planId,
      `Created seating plan "${input.title.trim()}" — ${rows}×${columns} = ${rows * columns} seats`,
    );
    return planId;
  },
});

export const updateSeatingPlan = mutation({
  args: { planId: v.id("examSeatingPlans"), patch: examSeatingPlanUpdateValidator },
  handler: async (ctx, { planId, patch }) => {
    const { userId, plan } = await requireOwnedPlan(ctx, planId);

    const title = patch.title ?? plan.title;
    const examName = patch.examName ?? plan.examName;
    const examDate = patch.examDate ?? plan.examDate;
    const startTime =
      patch.startTime !== undefined ? patch.startTime || undefined : plan.startTime;
    const durationMinutes =
      patch.durationMinutes !== undefined
        ? patch.durationMinutes ?? undefined
        : plan.durationMinutes;
    const rows = patch.rows ?? plan.rows;
    const columns = patch.columns ?? plan.columns;
    const status = patch.status ?? plan.status;

    validatePlanFields({ title, examName, examDate, startTime, durationMinutes, rows, columns, status });

    // Never shrink the grid past an existing assignment — every student keeps a seat.
    if (rows !== plan.rows || columns !== plan.columns) {
      const assignments = await ctx.db
        .query("examSeatingAssignments")
        .withIndex("by_seating_plan", (q) => q.eq("seatingPlanId", planId))
        .collect();
      const squeezed = assignments.find(
        (a) => a.row > rows || a.column > columns,
      );
      if (squeezed) {
        throw new Error(
          `Cannot shrink the grid: ${seatLabel(squeezed.row, squeezed.column)} still has ${squeezed.studentIdentifier} assigned. Move them first.`,
        );
      }
    }

    // Editing a Completed plan reopens it (unless the edit is an explicit
    // status change). Reopening lands on Draft.
    let nextStatus = status;
    let completedAt = plan.completedAt;
    if (patch.status === undefined && plan.status === "completed") {
      nextStatus = "draft";
      completedAt = undefined;
    } else if (patch.status !== undefined) {
      nextStatus = patch.status;
      completedAt =
        patch.status === "completed" ? (plan.completedAt ?? Date.now()) : undefined;
    }

    await ctx.db.patch(planId, {
      title: title.trim(),
      examName: examName.trim(),
      examDate,
      startTime,
      durationMinutes,
      room:
        patch.room !== undefined ? patch.room?.trim() || undefined : plan.room,
      rows,
      columns,
      notes:
        patch.notes !== undefined ? patch.notes?.trim() || undefined : plan.notes,
      status: nextStatus,
      completedAt,
      updatedAt: Date.now(),
    });

    const label = title.trim();
    const statusChanged = nextStatus !== plan.status;
    if (statusChanged && nextStatus === "completed") {
      await logActivity(
        ctx,
        userId,
        "completed",
        "exam_seating",
        planId,
        `Completed seating plan "${label}"`,
      );
    } else if (plan.status === "completed" && nextStatus === "draft") {
      await logActivity(
        ctx,
        userId,
        "updated",
        "exam_seating",
        planId,
        `Reopened seating plan "${label}" from Completed`,
      );
    } else if (statusChanged) {
      const statusLabel = EXAM_SEATING_STATUS_LABELS[
        nextStatus as (typeof EXAM_SEATING_STATUS_VALUES)[number]
      ];
      await logActivity(
        ctx,
        userId,
        "updated",
        "exam_seating",
        planId,
        `Changed status of "${label}" to ${statusLabel}`,
      );
    } else {
      await logActivity(
        ctx,
        userId,
        "updated",
        "exam_seating",
        planId,
        `Updated seating plan "${label}"`,
      );
    }
  },
});

export const deleteSeatingPlan = mutation({
  args: { planId: v.id("examSeatingPlans") },
  handler: async (ctx, { planId }) => {
    const { userId, plan } = await requireOwnedPlan(ctx, planId);
    const assignments = await ctx.db
      .query("examSeatingAssignments")
      .withIndex("by_seating_plan", (q) => q.eq("seatingPlanId", planId))
      .collect();
    for (const a of assignments) await ctx.db.delete(a._id);
    await ctx.db.delete(planId);
    await logActivity(
      ctx,
      userId,
      "deleted",
      "exam_seating",
      undefined,
      `Deleted seating plan "${plan.title}"`,
    );
  },
});

/**
 * Assign a student to one seat. Protects existing assignments: a seat already
 * occupied by another student errors (remove them first), and a student already
 * seated elsewhere errors (duplicate identifier, no double-seating).
 */
export const assignSeat = mutation({
  args: {
    planId: v.id("examSeatingPlans"),
    row: v.number(),
    column: v.number(),
    studentIdentifier: v.string(),
  },
  handler: async (ctx, { planId, row, column, studentIdentifier }) => {
    const { userId, plan } = await requireOwnedPlan(ctx, planId);
    const identifier = normalizeIdentifier(studentIdentifier);
    if (!identifier) throw new Error("Student identifier is required");
    validateSeat(plan.rows, plan.columns, row, column);

    const assignments = await ctx.db
      .query("examSeatingAssignments")
      .withIndex("by_seating_plan", (q) => q.eq("seatingPlanId", planId))
      .collect();

    const atSeat = assignments.find((a) => a.row === row && a.column === column);
    if (atSeat) {
      if (sameIdentifier(atSeat.studentIdentifier, identifier)) {
        // Same student at the same seat — nothing to change.
        return;
      }
      throw new Error(
        `Seat ${seatLabel(row, column)} is already assigned to ${atSeat.studentIdentifier}. Remove them first.`,
      );
    }

    const duplicate = assignments.find((a) =>
      sameIdentifier(a.studentIdentifier, identifier),
    );
    if (duplicate) {
      throw new Error(
        `Student "${identifier}" is already assigned to ${seatLabel(duplicate.row, duplicate.column)}.`,
      );
    }

    const now = Date.now();
    const assignmentId = await ctx.db.insert("examSeatingAssignments", {
      userId,
      seatingPlanId: planId,
      studentIdentifier: identifier,
      row,
      column,
      updatedAt: now,
    });

    await patchPlanAfterAssignmentChange(ctx, plan, {
      assignedCount: plan.assignedCount + 1,
    });

    await logActivity(
      ctx,
      userId,
      "updated",
      "exam_seating",
      assignmentId,
      `Assigned ${identifier} to ${seatLabel(row, column)}`,
    );
  },
});

/** Edit an existing assignment (change identifier and/or move seats). */
export const updateAssignment = mutation({
  args: {
    assignmentId: v.id("examSeatingAssignments"),
    patch: examSeatingAssignmentUpdateValidator,
  },
  handler: async (ctx, { assignmentId, patch }) => {
    const { userId, plan, assignment } = await requireOwnedAssignment(
      ctx,
      assignmentId,
    );

    const identifier =
      patch.studentIdentifier !== undefined
        ? normalizeIdentifier(patch.studentIdentifier)
        : assignment.studentIdentifier;
    const row = patch.row ?? assignment.row;
    const column = patch.column ?? assignment.column;
    if (!identifier) throw new Error("Student identifier is required");
    validateSeat(plan.rows, plan.columns, row, column);

    const assignments = await ctx.db
      .query("examSeatingAssignments")
      .withIndex("by_seating_plan", (q) => q.eq("seatingPlanId", plan._id))
      .collect();

    const atSeat = assignments.find(
      (a) => a._id !== assignmentId && a.row === row && a.column === column,
    );
    if (atSeat) {
      throw new Error(
        `Seat ${seatLabel(row, column)} is already assigned to ${atSeat.studentIdentifier}.`,
      );
    }
    const duplicate = assignments.find(
      (a) => a._id !== assignmentId && sameIdentifier(a.studentIdentifier, identifier),
    );
    if (duplicate) {
      throw new Error(
        `Student "${identifier}" is already assigned to ${seatLabel(duplicate.row, duplicate.column)}.`,
      );
    }

    await ctx.db.patch(assignmentId, {
      studentIdentifier: identifier,
      row,
      column,
      updatedAt: Date.now(),
    });
    await patchPlanAfterAssignmentChange(ctx, plan, {});

    await logActivity(
      ctx,
      userId,
      "updated",
      "exam_seating",
      assignmentId,
      `Updated assignment at ${seatLabel(row, column)} to ${identifier}`,
    );
  },
});

/** Remove a student from their seat. */
export const removeAssignment = mutation({
  args: { assignmentId: v.id("examSeatingAssignments") },
  handler: async (ctx, { assignmentId }) => {
    const { userId, plan, assignment } = await requireOwnedAssignment(
      ctx,
      assignmentId,
    );
    await ctx.db.delete(assignmentId);
    await patchPlanAfterAssignmentChange(ctx, plan, {
      assignedCount: Math.max(0, plan.assignedCount - 1),
    });
    await logActivity(
      ctx,
      userId,
      "updated",
      "exam_seating",
      plan._id,
      `Removed ${assignment.studentIdentifier} from ${seatLabel(assignment.row, assignment.column)}`,
    );
  },
});

/**
 * Deterministic auto-arrange: paste a list of student identifiers and they are
 * placed row-major (R1C1, R1C2, …). Replaces the current arrangement. Duplicate
 * identifiers error, and an over-capacity list errors without dropping anyone.
 */
export const autoArrangeSeats = mutation({
  args: {
    planId: v.id("examSeatingPlans"),
    studentIdentifiers: v.array(v.string()),
  },
  handler: async (ctx, { planId, studentIdentifiers }) => {
    const { userId, plan } = await requireOwnedPlan(ctx, planId);
    const ids = studentIdentifiers.map(normalizeIdentifier).filter(Boolean);

    const seen = new Set<string>();
    for (const id of ids) {
      const key = id.toLowerCase();
      if (seen.has(key)) {
        throw new Error(`Duplicate student identifier "${id}" in the list.`);
      }
      seen.add(key);
    }

    const capacity = plan.rows * plan.columns;
    if (ids.length > capacity) {
      throw new Error(
        `Too many students: capacity is ${capacity} seats but ${ids.length} were provided. No changes were made.`,
      );
    }

    const existing = await ctx.db
      .query("examSeatingAssignments")
      .withIndex("by_seating_plan", (q) => q.eq("seatingPlanId", planId))
      .collect();
    for (const a of existing) await ctx.db.delete(a._id);

    const now = Date.now();
    for (let i = 0; i < ids.length; i++) {
      const row = Math.floor(i / plan.columns) + 1;
      const column = (i % plan.columns) + 1;
      await ctx.db.insert("examSeatingAssignments", {
        userId,
        seatingPlanId: planId,
        studentIdentifier: ids[i],
        row,
        column,
        updatedAt: now,
      });
    }

    await patchPlanAfterAssignmentChange(ctx, plan, { assignedCount: ids.length });
    await logActivity(
      ctx,
      userId,
      "auto_arranged",
      "exam_seating",
      planId,
      `Auto-arranged ${ids.length} ${ids.length === 1 ? "student" : "students"} into "${plan.title}"`,
    );
  },
});

/**
 * Shuffle the current arrangement with a plain Fisher–Yates random shuffle of
 * the assigned student identifiers. Deterministic placement afterwards, but the
 * order is random — never claimed to be academically optimal.
 */
export const shuffleAssignments = mutation({
  args: { planId: v.id("examSeatingPlans") },
  handler: async (ctx, { planId }) => {
    const { userId, plan } = await requireOwnedPlan(ctx, planId);
    const existing = await ctx.db
      .query("examSeatingAssignments")
      .withIndex("by_seating_plan", (q) => q.eq("seatingPlanId", planId))
      .collect();
    if (existing.length < 2) {
      throw new Error("Assign at least two students before shuffling.");
    }

    const ids = existing.map((a) => a.studentIdentifier);
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }

    const now = Date.now();
    for (let i = 0; i < existing.length; i++) {
      const row = Math.floor(i / plan.columns) + 1;
      const column = (i % plan.columns) + 1;
      await ctx.db.patch(existing[i]._id, {
        studentIdentifier: ids[i],
        row,
        column,
        updatedAt: now,
      });
    }

    await patchPlanAfterAssignmentChange(ctx, plan, {});
    await logActivity(
      ctx,
      userId,
      "shuffled",
      "exam_seating",
      planId,
      `Shuffled seating for "${plan.title}" (${ids.length} ${ids.length === 1 ? "student" : "students"})`,
    );
  },
});

const EXAM_SEATING_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  ready: "Ready",
  completed: "Completed",
};

/**
 * Server-computed exam-seating summary for the dashboard: plan counts by
 * status plus the next upcoming plan (soonest exam date among open plans).
 */
export const getSeatingSummary = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    const plans = await ctx.db
      .query("examSeatingPlans")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const today = todayStr();
    const soonEnd = dateStrWithOffset(3);

    const shape = (p: Doc<"examSeatingPlans">) => {
      const { userId: _userId, ...rest } = p;
      return rest;
    };

    const open = plans.filter((p) => p.status !== "completed");
    const upcoming = open
      .filter((p) => p.examDate >= today)
      .sort((a, b) => (a.examDate < b.examDate ? -1 : 1));
    const nextPlan = upcoming[0] ?? null;

    return {
      total: plans.length,
      draft: plans.filter((p) => p.status === "draft").length,
      ready: plans.filter((p) => p.status === "ready").length,
      completed: plans.filter((p) => p.status === "completed").length,
      upcomingSoon: open.filter(
        (p) => p.examDate >= today && p.examDate <= soonEnd,
      ).length,
      nextPlan: nextPlan ? shape(nextPlan) : null,
    };
  },
});