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

// --- Lessons (Phase 2A) ---

export const LESSON_STATUS_VALUES = ["planned", "in_progress", "completed"] as const;
export const LESSON_PRIORITY_VALUES = ["low", "medium", "high"] as const;

export const lessonInputValidator = v.object({
  title: v.string(),
  subject: v.string(),
  classGrade: v.string(),
  section: v.optional(v.string()),
  topic: v.string(),
  lessonDate: v.string(), // "YYYY-MM-DD"
  durationMinutes: v.optional(v.number()),
  objectives: v.optional(v.string()),
  teachingActivities: v.optional(v.string()),
  materials: v.optional(v.string()),
  homework: v.optional(v.string()),
  notes: v.optional(v.string()),
  status: v.string(),
  priority: v.string(),
});

export const lessonUpdateValidator = v.object({
  title: v.optional(v.string()),
  subject: v.optional(v.string()),
  classGrade: v.optional(v.string()),
  section: v.optional(v.nullable(v.string())),
  topic: v.optional(v.string()),
  lessonDate: v.optional(v.string()),
  durationMinutes: v.optional(v.nullable(v.number())),
  objectives: v.optional(v.nullable(v.string())),
  teachingActivities: v.optional(v.nullable(v.string())),
  materials: v.optional(v.nullable(v.string())),
  homework: v.optional(v.nullable(v.string())),
  notes: v.optional(v.nullable(v.string())),
  status: v.optional(v.string()),
  priority: v.optional(v.string()),
});
