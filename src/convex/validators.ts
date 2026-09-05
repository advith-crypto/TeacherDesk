import { v } from "convex/values";

export const CATEGORY_VALUES = [
  "general",
  "lesson_planning",
  "corrections",
  "question_paper",
  "examination",
  "timetable",
  "administration",
  "other",
] as const;

export const PRIORITY_VALUES = ["low", "medium", "high", "urgent"] as const;
export const STATUS_VALUES = ["todo", "in_progress", "completed"] as const;

export const categoryValidator = v.string();
export const priorityValidator = v.string();
export const statusValidator = v.string();

export const subtaskInputValidator = v.object({
  title: v.string(),
});

export const taskInputValidator = v.object({
  title: v.string(),
  description: v.optional(v.string()),
  category: categoryValidator,
  priority: priorityValidator,
  status: statusValidator,
  dueDate: v.optional(v.string()),
  dueTime: v.optional(v.string()),
  subtasks: v.optional(v.array(subtaskInputValidator)),
});

export const taskUpdateValidator = v.object({
  title: v.optional(v.string()),
  description: v.optional(v.nullable(v.string())),
  category: v.optional(categoryValidator),
  priority: v.optional(priorityValidator),
  status: v.optional(statusValidator),
  dueDate: v.optional(v.nullable(v.string())),
  dueTime: v.optional(v.nullable(v.string())),
});

export const subtaskToggleValidator = v.object({
  taskId: v.id("tasks"),
  subtaskId: v.id("subtasks"),
});
