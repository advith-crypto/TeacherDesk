import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import {
  CATEGORY_VALUES,
  PRIORITY_VALUES,
  STATUS_VALUES,
  taskInputValidator,
  taskUpdateValidator,
} from "./validators";

/** Verify the user is authenticated and owns the given task. Throws otherwise. */
async function requireOwnedTask(
  ctx: QueryCtx,
  taskId: Id<"tasks">,
): Promise<{ userId: Id<"users">; task: Doc<"tasks"> }> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Not authenticated");
  const task = await ctx.db.get(taskId);
  if (!task) throw new Error("Task not found");
  if (task.userId !== userId) throw new Error("Not authorized");
  return { userId, task };
}

async function requireAuth(ctx: QueryCtx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Not authenticated");
  return userId;
}

async function logActivity(
  ctx: Pick<MutationCtx, "db">,
  userId: Id<"users">,
  action: string,
  entityType: string,
  entityId: Id<"tasks"> | undefined,
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

/** Shape returned to the client (task + its subtasks). */
export type TaskWithSubtasks = {
  _id: Id<"tasks">;
  title: string;
  description?: string;
  category: string;
  priority: string;
  status: string;
  dueDate?: string;
  dueTime?: string;
  completedAt?: number;
  _creationTime: number;
  subtasks: {
    _id: Id<"subtasks">;
    title: string;
    isCompleted: boolean;
    position: number;
  }[];
};

export const listTasks = query({
  args: {},
  handler: async (ctx): Promise<TaskWithSubtasks[]> => {
    const userId = await requireAuth(ctx);
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const result: TaskWithSubtasks[] = [];
    for (const task of tasks) {
      const subtasks = await ctx.db
        .query("subtasks")
        .withIndex("by_task", (q) => q.eq("taskId", task._id))
        .collect();
      result.push({
        _id: task._id,
        title: task.title,
        description: task.description,
        category: task.category,
        priority: task.priority,
        status: task.status,
        dueDate: task.dueDate,
        dueTime: task.dueTime,
        completedAt: task.completedAt,
        _creationTime: task._creationTime,
        subtasks: subtasks
          .sort((a, b) => a.position - b.position)
          .map((s) => ({
            _id: s._id,
            title: s.title,
            isCompleted: s.isCompleted,
            position: s.position,
          })),
      });
    }
    return result;
  },
});

export const getTask = query({
  args: { taskId: v.id("tasks") },
  handler: async (
    ctx,
    { taskId },
  ): Promise<(Doc<"tasks"> & { subtasks: Doc<"subtasks">[] }) | null> => {
    const { task } = await requireOwnedTask(ctx, taskId);
    const subtasks = await ctx.db
      .query("subtasks")
      .withIndex("by_task", (q) => q.eq("taskId", task._id))
      .collect();
    return {
      ...task,
      subtasks: subtasks.sort((a, b) => a.position - b.position),
    };
  },
});

export const createTask = mutation({
  args: { input: taskInputValidator },
  handler: async (ctx, { input }): Promise<Id<"tasks">> => {
    const userId = await requireAuth(ctx);

    const title = input.title.trim();
    if (!title) throw new Error("Title is required");
    if (title.length > 200) throw new Error("Title is too long");
    if (!CATEGORY_VALUES.includes(input.category as never))
      throw new Error("Invalid category");
    if (!PRIORITY_VALUES.includes(input.priority as never))
      throw new Error("Invalid priority");
    if (!STATUS_VALUES.includes(input.status as never))
      throw new Error("Invalid status");

    const now = Date.now();
    const taskId = await ctx.db.insert("tasks", {
      userId,
      title,
      description: input.description?.trim() || undefined,
      category: input.category,
      priority: input.priority,
      status: input.status,
      dueDate: input.dueDate || undefined,
      dueTime: input.dueTime || undefined,
      completedAt: input.status === "completed" ? now : undefined,
    });

    const subtasks = input.subtasks ?? [];
    for (let i = 0; i < subtasks.length; i++) {
      const t = subtasks[i].title.trim();
      if (!t) continue;
      await ctx.db.insert("subtasks", {
        userId,
        taskId,
        title: t.slice(0, 200),
        isCompleted: false,
        position: i,
      });
    }

    await logActivity(
      ctx,
      userId,
      "created",
      "task",
      taskId,
      `Created task "${title}"`,
    );
    return taskId;
  },
});

export const updateTask = mutation({
  args: { taskId: v.id("tasks"), patch: taskUpdateValidator },
  handler: async (ctx, { taskId, patch }) => {
    const { userId, task } = await requireOwnedTask(ctx, taskId);

    const clean: Partial<Doc<"tasks">> = {};
    if (patch.title !== undefined) {
      const t = patch.title.trim();
      if (!t) throw new Error("Title is required");
      clean.title = t;
    }
    if (patch.description !== undefined)
      clean.description = patch.description?.trim() || undefined;
    if (patch.category !== undefined) {
      if (!CATEGORY_VALUES.includes(patch.category as never))
        throw new Error("Invalid category");
      clean.category = patch.category;
    }
    if (patch.priority !== undefined) {
      if (!PRIORITY_VALUES.includes(patch.priority as never))
        throw new Error("Invalid priority");
      clean.priority = patch.priority;
    }
    if (patch.status !== undefined) {
      if (!STATUS_VALUES.includes(patch.status as never))
        throw new Error("Invalid status");
      clean.status = patch.status;
      clean.completedAt =
        patch.status === "completed"
          ? (task.completedAt ?? Date.now())
          : undefined;
    }
    if (patch.dueDate !== undefined) clean.dueDate = patch.dueDate || undefined;
    if (patch.dueTime !== undefined) clean.dueTime = patch.dueTime || undefined;

    await ctx.db.patch(taskId, clean);
    const label = clean.title ?? task.title;
    await logActivity(
      ctx,
      userId,
      patch.status === "completed" ? "completed" : "updated",
      "task",
      taskId,
      patch.status === "completed"
        ? `Completed task "${label}"`
        : `Updated task "${label}"`,
    );
  },
});

export const deleteTask = mutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, { taskId }) => {
    const { userId, task } = await requireOwnedTask(ctx, taskId);
    const subtasks = await ctx.db
      .query("subtasks")
      .withIndex("by_task", (q) => q.eq("taskId", taskId))
      .collect();
    for (const s of subtasks) await ctx.db.delete(s._id);
    await ctx.db.delete(taskId);
    await logActivity(
      ctx,
      userId,
      "deleted",
      "task",
      undefined,
      `Deleted task "${task.title}"`,
    );
  },
});

export const addSubtask = mutation({
  args: { taskId: v.id("tasks"), title: v.string() },
  handler: async (ctx, { taskId, title }) => {
    const { userId } = await requireOwnedTask(ctx, taskId);
    const t = title.trim();
    if (!t) throw new Error("Subtask title is required");
    const existing = await ctx.db
      .query("subtasks")
      .withIndex("by_task", (q) => q.eq("taskId", taskId))
      .collect();
    await ctx.db.insert("subtasks", {
      userId,
      taskId,
      title: t.slice(0, 200),
      isCompleted: false,
      position: existing.length,
    });
    await logActivity(ctx, userId, "updated", "subtask", taskId, "Added a subtask");
  },
});

export const toggleSubtask = mutation({
  args: { subtaskId: v.id("subtasks") },
  handler: async (ctx, { subtaskId }) => {
    const userId = await requireAuth(ctx);
    const sub = await ctx.db.get(subtaskId);
    if (!sub) throw new Error("Subtask not found");
    if (sub.userId !== userId) throw new Error("Not authorized");
    await ctx.db.patch(subtaskId, { isCompleted: !sub.isCompleted });
  },
});

export const deleteSubtask = mutation({
  args: { subtaskId: v.id("subtasks") },
  handler: async (ctx, { subtaskId }) => {
    const userId = await requireAuth(ctx);
    const sub = await ctx.db.get(subtaskId);
    if (!sub) throw new Error("Subtask not found");
    if (sub.userId !== userId) throw new Error("Not authorized");
    await ctx.db.delete(subtaskId);
  },
});

export const listActivities = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const userId = await requireAuth(ctx);
    const activities = await ctx.db
      .query("activities")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit ?? 15);
    return activities.map((a) => ({
      _id: a._id,
      action: a.action,
      entityType: a.entityType,
      summary: a.summary,
      _creationTime: a._creationTime,
    }));
  },
});
