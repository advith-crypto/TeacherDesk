import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const schema = defineSchema({
  // Default auth tables from convex auth. Do not remove or modify.
  ...authTables,

  // The default users table brought in by the authTables.
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    role: v.optional(v.string()),
  }).index("email", ["email"]),

  /**
   * Teacher profile - one per user. Stores teaching context that later
   * modules (lessons, timetable, exam seating) will reuse. Fully generic:
   * works for any school, board, subject, or country.
   */
  teacherProfiles: defineTable({
    userId: v.id("users"),
    fullName: v.optional(v.string()),
    schoolName: v.optional(v.string()),
    board: v.optional(v.string()),
    subjects: v.array(v.string()),
    grades: v.array(v.string()),
    workStartTime: v.optional(v.string()), // "HH:MM"
    workEndTime: v.optional(v.string()), // "HH:MM"
    workDay: v.optional(v.string()), // e.g. "Mon-Fri"
    onboardingComplete: v.boolean(),
  }).index("by_user", ["userId"]),

  /**
   * Teacher tasks - the Phase 1 core. Every row carries userId for strict
   * ownership isolation. Subtasks live in a separate table.
   */
  tasks: defineTable({
    userId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    category: v.string(),
    priority: v.string(),
    status: v.string(),
    dueDate: v.optional(v.string()), // "YYYY-MM-DD"
    dueTime: v.optional(v.string()), // "HH:MM"
    completedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"])
    .index("by_user_due", ["userId", "dueDate"]),

  /**
   * Task subtasks - ordered checklist items belonging to a task.
   */
  subtasks: defineTable({
    userId: v.id("users"),
    taskId: v.id("tasks"),
    title: v.string(),
    isCompleted: v.boolean(),
    position: v.number(),
  })
    .index("by_task", ["taskId"])
    .index("by_user", ["userId"]),

  /**
   * Activity history - important user actions for the recent-activity feed.
   */
  activities: defineTable({
    userId: v.id("users"),
    action: v.string(), // created | updated | completed | reopened | deleted | profile_updated | onboarded
    entityType: v.string(), // task | subtask | profile | account
    entityId: v.optional(v.id("tasks")),
    summary: v.string(),
  }).index("by_user", ["userId"]), // _creationTime ordering is implicit

  /**
   * Per-user app settings (theme, notification preference placeholder).
   */
  userSettings: defineTable({
    userId: v.id("users"),
    theme: v.optional(v.string()), // "light" | "dark" | "system"
  }).index("by_user", ["userId"]),
});

export default schema;
