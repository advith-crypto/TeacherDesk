import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import {
  timetableEntryInputValidator,
  timetableEntryUpdateValidator,
} from "./validators";

async function requireAuth(ctx: QueryCtx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Not authenticated");
  return userId;
}

/** Verify the user is authenticated and owns the given entry. Throws otherwise. */
async function requireOwnedEntry(
  ctx: QueryCtx,
  entryId: Id<"timetableEntries">,
): Promise<{ userId: Id<"users">; entry: Doc<"timetableEntries"> }> {
  const userId = await requireAuth(ctx);
  const entry = await ctx.db.get(entryId);
  if (!entry) throw new Error("Timetable period not found");
  if (entry.userId !== userId) throw new Error("Not authorized");
  return { userId, entry };
}

/** Records an entry in the shared activity history (same table other modules use). */
async function logActivity(
  ctx: Pick<MutationCtx, "db">,
  userId: Id<"users">,
  action: string,
  entityType: string,
  entityId: Id<"timetableEntries"> | undefined,
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

/** "HH:MM" → minutes since midnight. Returns -1 for malformed input. */
function timeToMinutes(value: string): number {
  if (!TIME_PATTERN.test(value)) return -1;
  const [h, m] = value.split(":").map((n) => Number.parseInt(n, 10));
  return h * 60 + m;
}

const DAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function validateTimeRange(startTime: string, endTime: string) {
  if (!TIME_PATTERN.test(startTime))
    throw new Error("Start time must be a valid time in HH:MM format");
  if (!TIME_PATTERN.test(endTime))
    throw new Error("End time must be a valid time in HH:MM format");
  if (timeToMinutes(endTime) <= timeToMinutes(startTime))
    throw new Error("End time must be after the start time");
}

function validateEntryFields(input: {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  subject: string;
  classGrade: string;
}) {
  if (!Number.isInteger(input.dayOfWeek) || input.dayOfWeek < 0 || input.dayOfWeek > 6)
    throw new Error("Day must be a valid day of the week");
  if (!input.subject.trim()) throw new Error("Subject is required");
  if (input.subject.length > 120) throw new Error("Subject is too long");
  if (!input.classGrade.trim()) throw new Error("Class / grade is required");
  if (input.classGrade.length > 120) throw new Error("Class / grade is too long");
  validateTimeRange(input.startTime, input.endTime);
}

/**
 * Deterministic overlap check: two periods conflict when they occur on the
 * same day and their time ranges overlap (end exclusive, so 09:00–09:45 and
 * 09:45–10:30 do NOT conflict). No AI — pure minute arithmetic.
 */
function rangesOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/** Human-readable label for a conflicting period, e.g. `"Mathematics" (09:30–10:15)`. */
function conflictLabel(entry: Doc<"timetableEntries">): string {
  const title = entry.subject + (entry.classGrade ? `, ${entry.classGrade}` : "");
  return `"${title}" (${entry.startTime}–${entry.endTime})`;
}

/**
 * Find entries that overlap the candidate time on the same day. `excludeId`
 * lets updates ignore the entry being edited.
 */
async function findConflicts(
  ctx: Pick<QueryCtx, "db">,
  userId: Id<"users">,
  dayOfWeek: number,
  startMinutes: number,
  endMinutes: number,
  excludeId?: Id<"timetableEntries">,
): Promise<Doc<"timetableEntries">[]> {
  const sameDay = await ctx.db
    .query("timetableEntries")
    .withIndex("by_user_day", (q) => q.eq("userId", userId).eq("dayOfWeek", dayOfWeek))
    .collect();
  return sameDay.filter(
    (e) =>
      e._id !== excludeId &&
      rangesOverlap(
        startMinutes,
        endMinutes,
        timeToMinutes(e.startTime),
        timeToMinutes(e.endTime),
      ),
  );
}

/** Shape returned to the client. */
export type TimetableEntryRecord = Omit<Doc<"timetableEntries">, "userId"> & {
  _id: Id<"timetableEntries">;
};

export const listTimetableEntries = query({
  args: {},
  handler: async (ctx): Promise<TimetableEntryRecord[]> => {
    const userId = await requireAuth(ctx);
    const entries = await ctx.db
      .query("timetableEntries")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return entries.map(({ userId: _userId, ...rest }) => rest);
  },
});

export const getTimetableEntry = query({
  args: { entryId: v.id("timetableEntries") },
  handler: async (ctx, { entryId }): Promise<TimetableEntryRecord | null> => {
    const { entry } = await requireOwnedEntry(ctx, entryId);
    const { userId: _userId, ...rest } = entry;
    return rest;
  },
});

export const createTimetableEntry = mutation({
  args: { input: timetableEntryInputValidator },
  handler: async (ctx, { input }): Promise<Id<"timetableEntries">> => {
    const userId = await requireAuth(ctx);
    validateEntryFields(input);

    const startMinutes = timeToMinutes(input.startTime);
    const endMinutes = timeToMinutes(input.endTime);
    const conflicts = await findConflicts(
      ctx,
      userId,
      input.dayOfWeek,
      startMinutes,
      endMinutes,
    );
    if (conflicts.length > 0) {
      const dayLabel = DAY_LABELS[input.dayOfWeek];
      throw new Error(
        `This period overlaps with ${conflictLabel(conflicts[0])} on ${dayLabel}`,
      );
    }

    const entryId = await ctx.db.insert("timetableEntries", {
      userId,
      dayOfWeek: input.dayOfWeek,
      startTime: input.startTime,
      endTime: input.endTime,
      subject: input.subject.trim(),
      classGrade: input.classGrade.trim(),
      section: input.section?.trim() || undefined,
      room: input.room?.trim() || undefined,
      notes: input.notes?.trim() || undefined,
      updatedAt: Date.now(),
    });

    await logActivity(
      ctx,
      userId,
      "created",
      "timetable",
      entryId,
      `Added ${DAY_LABELS[input.dayOfWeek]} period: ${input.subject.trim()}, ${input.classGrade.trim()} (${input.startTime}–${input.endTime})`,
    );
    return entryId;
  },
});

export const updateTimetableEntry = mutation({
  args: { entryId: v.id("timetableEntries"), patch: timetableEntryUpdateValidator },
  handler: async (ctx, { entryId, patch }) => {
    const { userId, entry } = await requireOwnedEntry(ctx, entryId);

    const dayOfWeek = patch.dayOfWeek ?? entry.dayOfWeek;
    const startTime = patch.startTime ?? entry.startTime;
    const endTime = patch.endTime ?? entry.endTime;
    const subject = patch.subject ?? entry.subject;
    const classGrade = patch.classGrade ?? entry.classGrade;

    validateEntryFields({ dayOfWeek, startTime, endTime, subject, classGrade });

    const conflicts = await findConflicts(
      ctx,
      userId,
      dayOfWeek,
      timeToMinutes(startTime),
      timeToMinutes(endTime),
      entryId,
    );
    if (conflicts.length > 0) {
      throw new Error(
        `This period overlaps with ${conflictLabel(conflicts[0])} on ${DAY_LABELS[dayOfWeek]}`,
      );
    }

    const clean: Partial<Doc<"timetableEntries">> = {
      dayOfWeek,
      startTime,
      endTime,
      subject: subject.trim(),
      classGrade: classGrade.trim(),
      section:
        patch.section !== undefined
          ? patch.section?.trim() || undefined
          : entry.section,
      room:
        patch.room !== undefined ? patch.room?.trim() || undefined : entry.room,
      notes:
        patch.notes !== undefined
          ? patch.notes?.trim() || undefined
          : entry.notes,
      updatedAt: Date.now(),
    };

    await ctx.db.patch(entryId, clean);

    await logActivity(
      ctx,
      userId,
      "updated",
      "timetable",
      entryId,
      `Updated ${DAY_LABELS[dayOfWeek]} period: ${subject.trim()}, ${classGrade.trim()}`,
    );
  },
});

export const deleteTimetableEntry = mutation({
  args: { entryId: v.id("timetableEntries") },
  handler: async (ctx, { entryId }) => {
    const { userId, entry } = await requireOwnedEntry(ctx, entryId);
    await ctx.db.delete(entryId);
    await logActivity(
      ctx,
      userId,
      "deleted",
      "timetable",
      undefined,
      `Removed ${DAY_LABELS[entry.dayOfWeek]} period: ${entry.subject}, ${entry.classGrade}`,
    );
  },
});

/**
 * Server-computed timetable summary for the dashboard: today's schedule,
 * the current and next class (based on the server's local time), and
 * per-day/week totals. Deterministic — pure clock math, no AI.
 */
export const getTimetableSummary = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    const entries = await ctx.db
      .query("timetableEntries")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const shape = (e: Doc<"timetableEntries">) => {
      const { userId: _userId, ...rest } = e;
      return rest;
    };

    const now = new Date();
    const todayDay = now.getDay(); // 0 = Sunday .. 6 = Saturday
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    const todays = entries
      .filter((e) => e.dayOfWeek === todayDay)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    const current = todays.find(
      (e) =>
        timeToMinutes(e.startTime) <= nowMinutes &&
        nowMinutes < timeToMinutes(e.endTime),
    );
    const next = todays.find((e) => timeToMinutes(e.startTime) > nowMinutes);

    return {
      total: entries.length,
      weekTotal: entries.length,
      todayCount: todays.length,
      todayDay,
      current: current ? shape(current) : null,
      next: next ? shape(next) : null,
    };
  },
});