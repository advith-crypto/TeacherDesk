import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/** Get the signed-in teacher's profile, or null if none exists yet. */
export const getProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const profile = await ctx.db
      .query("teacherProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    return profile;
  },
});

/** Save (create or update) the teacher profile. One profile per user. */
export const saveProfile = mutation({
  args: {
    fullName: v.string(),
    schoolName: v.optional(v.string()),
    board: v.optional(v.string()),
    subjects: v.array(v.string()),
    grades: v.array(v.string()),
    workStartTime: v.optional(v.string()),
    workEndTime: v.optional(v.string()),
    workDay: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    const fullName = args.fullName.trim();
    if (!fullName) throw new Error("Full name is required");
    if (fullName.length > 120) throw new Error("Name is too long");
    if (args.schoolName && args.schoolName.length > 160)
      throw new Error("School name is too long");
    if (args.board && args.board.length > 120) throw new Error("Board is too long");
    if (args.workDay && args.workDay.length > 40)
      throw new Error("Work day is too long");

    const existing = await ctx.db
      .query("teacherProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const data = {
      userId,
      fullName,
      schoolName: args.schoolName?.trim() || undefined,
      board: args.board?.trim() || undefined,
      subjects: args.subjects.map((s) => s.trim()).filter(Boolean).slice(0, 20),
      grades: args.grades.map((g) => g.trim()).filter(Boolean).slice(0, 20),
      workStartTime: args.workStartTime || undefined,
      workEndTime: args.workEndTime || undefined,
      workDay: args.workDay?.trim() || undefined,
      onboardingComplete: true,
    };

    let profileId: string;
    if (existing) {
      await ctx.db.patch(existing._id as never, data as never);
      profileId = existing._id as never;
    } else {
      profileId = (await ctx.db.insert(
        "teacherProfiles",
        data as never,
      )) as never;
    }

    await ctx.db.insert("activities", {
      userId,
      action: existing ? "profile_updated" : "onboarded",
      entityType: "profile",
      summary: existing ? "Updated teacher profile" : "Set up TeacherDesk",
    });

    return profileId;
  },
});

/**
 * Delete every TeacherDesk record owned by the current user — profile,
 * tasks, subtasks, activity history, settings, and all Phase 2 module rows
 * (lessons, corrections, question papers, timetable entries, exam seating
 * plans and their assignments). Used by "Delete account data".
 */
export const clearMyData = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    // Tasks + their subtasks.
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const task of tasks) {
      const subs = await ctx.db
        .query("subtasks")
        .withIndex("by_task", (q) => q.eq("taskId", task._id))
        .collect();
      for (const s of subs) await ctx.db.delete(s._id);
      await ctx.db.delete(task._id);
    }

    // Exam seating plans first so their assignments can be purged too.
    const plans = await ctx.db
      .query("examSeatingPlans")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const plan of plans) {
      const assignments = await ctx.db
        .query("examSeatingAssignments")
        .withIndex("by_seating_plan", (q) => q.eq("seatingPlanId", plan._id))
        .collect();
      for (const a of assignments) await ctx.db.delete(a._id);
      await ctx.db.delete(plan._id);
    }

    // Remaining Phase 2 module rows (all keyed by userId).
    for (const table of [
      "lessons",
      "corrections",
      "questionPapers",
      "timetableEntries",
    ] as const) {
      const rows = await ctx.db
        .query(table)
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      for (const row of rows) await ctx.db.delete(row._id);
    }

    // Activity history.
    const activities = await ctx.db
      .query("activities")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const a of activities) await ctx.db.delete(a._id);

    // Profile + per-user settings.
    const profile = await ctx.db
      .query("teacherProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (profile) await ctx.db.delete(profile._id);

    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (settings) await ctx.db.delete(settings._id);
  },
});

/** Per-user app settings: theme preference. */
export const getSettings = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    return await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
  },
});

export const saveTheme = mutation({
  args: { theme: v.string() },
  handler: async (ctx, { theme }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    if (!["light", "dark", "system"].includes(theme))
      throw new Error("Invalid theme");
    const existing = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id as never, { theme } as never);
    } else {
      await ctx.db.insert("userSettings", { userId, theme });
    }
  },
});
