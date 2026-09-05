import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import {
  LESSON_PRIORITY_VALUES,
  LESSON_STATUS_VALUES,
  lessonInputValidator,
  lessonUpdateValidator,
} from "./validators";

async function requireAuth(ctx: QueryCtx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Not authenticated");
  return userId;
}

/** Verify the user is authenticated and owns the given lesson. Throws otherwise. */
async function requireOwnedLesson(
  ctx: QueryCtx,
  lessonId: Id<"lessons">,
): Promise<{ userId: Id<"users">; lesson: Doc<"lessons"> }> {
  const userId = await requireAuth(ctx);
  const lesson = await ctx.db.get(lessonId);
  if (!lesson) throw new Error("Lesson not found");
  if (lesson.userId !== userId) throw new Error("Not authorized");
  return { userId, lesson };
}

/** Records an entry in the shared activity history (same table tasks use). */
async function logActivity(
  ctx: Pick<MutationCtx, "db">,
  userId: Id<"users">,
  action: string,
  entityType: string,
  entityId: Id<"lessons"> | undefined,
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

function validateLessonFields(input: {
  title: string;
  subject: string;
  classGrade: string;
  topic: string;
  lessonDate: string;
  status: string;
  priority: string;
}) {
  if (!input.title.trim()) throw new Error("Lesson title is required");
  if (input.title.length > 200) throw new Error("Lesson title is too long");
  if (!input.subject.trim()) throw new Error("Subject is required");
  if (input.subject.length > 120) throw new Error("Subject is too long");
  if (!input.classGrade.trim()) throw new Error("Class / grade is required");
  if (input.classGrade.length > 120) throw new Error("Class / grade is too long");
  if (!input.topic.trim()) throw new Error("Topic is required");
  if (input.topic.length > 200) throw new Error("Topic is too long");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.lessonDate))
    throw new Error("Lesson date is required");
  if (!LESSON_STATUS_VALUES.includes(input.status as never))
    throw new Error("Invalid status");
  if (!LESSON_PRIORITY_VALUES.includes(input.priority as never))
    throw new Error("Invalid priority");
}

/** Shape returned to the client. */
export type LessonRecord = Omit<Doc<"lessons">, "userId"> & {
  _id: Id<"lessons">;
};

export const listLessons = query({
  args: {},
  handler: async (ctx): Promise<LessonRecord[]> => {
    const userId = await requireAuth(ctx);
    const lessons = await ctx.db
      .query("lessons")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return lessons.map(({ userId: _userId, ...rest }) => rest);
  },
});

export const getLesson = query({
  args: { lessonId: v.id("lessons") },
  handler: async (ctx, { lessonId }): Promise<LessonRecord | null> => {
    const { lesson } = await requireOwnedLesson(ctx, lessonId);
    const { userId: _userId, ...rest } = lesson;
    return rest;
  },
});

export const createLesson = mutation({
  args: { input: lessonInputValidator },
  handler: async (ctx, { input }): Promise<Id<"lessons">> => {
    const userId = await requireAuth(ctx);
    validateLessonFields(input);

    const now = Date.now();
    const lessonId = await ctx.db.insert("lessons", {
      userId,
      title: input.title.trim(),
      subject: input.subject.trim(),
      classGrade: input.classGrade.trim(),
      section: input.section?.trim() || undefined,
      topic: input.topic.trim(),
      lessonDate: input.lessonDate,
      durationMinutes: input.durationMinutes ?? undefined,
      objectives: input.objectives?.trim() || undefined,
      teachingActivities: input.teachingActivities?.trim() || undefined,
      materials: input.materials?.trim() || undefined,
      homework: input.homework?.trim() || undefined,
      notes: input.notes?.trim() || undefined,
      status: input.status,
      priority: input.priority,
      completedAt: input.status === "completed" ? now : undefined,
    });

    await logActivity(
      ctx,
      userId,
      "created",
      "lesson",
      lessonId,
      `Created lesson "${input.title.trim()}"`,
    );
    return lessonId;
  },
});

export const updateLesson = mutation({
  args: { lessonId: v.id("lessons"), patch: lessonUpdateValidator },
  handler: async (ctx, { lessonId, patch }) => {
    const { userId, lesson } = await requireOwnedLesson(ctx, lessonId);

    const clean: Partial<Doc<"lessons">> = {};
    if (patch.title !== undefined) {
      const t = patch.title.trim();
      if (!t) throw new Error("Lesson title is required");
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
    if (patch.topic !== undefined) {
      const t = patch.topic.trim();
      if (!t) throw new Error("Topic is required");
      clean.topic = t;
    }
    if (patch.lessonDate !== undefined) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(patch.lessonDate))
        throw new Error("Lesson date is required");
      clean.lessonDate = patch.lessonDate;
    }
    if (patch.durationMinutes !== undefined)
      clean.durationMinutes = patch.durationMinutes ?? undefined;
    for (const field of [
      "objectives",
      "teachingActivities",
      "materials",
      "homework",
      "notes",
    ] as const) {
      const value = patch[field];
      if (value !== undefined) clean[field] = value?.trim() || undefined;
    }
    if (patch.status !== undefined) {
      if (!LESSON_STATUS_VALUES.includes(patch.status as never))
        throw new Error("Invalid status");
      clean.status = patch.status;
      clean.completedAt =
        patch.status === "completed"
          ? (lesson.completedAt ?? Date.now())
          : undefined;
    }
    if (patch.priority !== undefined) {
      if (!LESSON_PRIORITY_VALUES.includes(patch.priority as never))
        throw new Error("Invalid priority");
      clean.priority = patch.priority;
    }

    await ctx.db.patch(lessonId, clean);
    const label = clean.title ?? lesson.title;
    await logActivity(
      ctx,
      userId,
      patch.status === "completed" ? "completed" : "updated",
      "lesson",
      lessonId,
      patch.status === "completed"
        ? `Completed lesson "${label}"`
        : `Updated lesson "${label}"`,
    );
  },
});

export const deleteLesson = mutation({
  args: { lessonId: v.id("lessons") },
  handler: async (ctx, { lessonId }) => {
    const { userId, lesson } = await requireOwnedLesson(ctx, lessonId);
    await ctx.db.delete(lessonId);
    await logActivity(
      ctx,
      userId,
      "deleted",
      "lesson",
      undefined,
      `Deleted lesson "${lesson.title}"`,
    );
  },
});

/**
 * Server-computed lesson summary for the dashboard: today's lessons, the next
 * upcoming lesson, and the count planned in the next 7 days (incl. today).
 */
export const getLessonSummary = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuth(ctx);
    const lessons = await ctx.db
      .query("lessons")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const today = todayStr();
    const weekEnd = dateStrWithOffset(6); // today .. today+6 = this week

    const shape = (l: Doc<"lessons">) => {
      const { userId: _userId, ...rest } = l;
      return rest;
    };

    const todays = lessons
      .filter((l) => l.lessonDate === today && l.status !== "completed")
      .sort((a, b) => a.title.localeCompare(b.title))
      .map(shape);

    const upcoming = lessons
      .filter(
        (l) =>
          l.lessonDate > today &&
          l.lessonDate <= weekEnd &&
          l.status !== "completed",
      )
      .sort((a, b) =>
        a.lessonDate === b.lessonDate
          ? a.title.localeCompare(b.title)
          : a.lessonDate < b.lessonDate
            ? -1
            : 1,
      )
      .map(shape);

    const plannedThisWeek = lessons.filter(
      (l) =>
        l.lessonDate >= today &&
        l.lessonDate <= weekEnd &&
        l.status !== "completed",
    ).length;

    return {
      todays,
      next: upcoming[0] ?? null,
      plannedThisWeek,
      total: lessons.length,
    };
  },
});
