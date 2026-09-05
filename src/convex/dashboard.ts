import { getAuthUserId } from "@convex-dev/auth/server";
import { query, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

async function requireAuth(ctx: QueryCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Not authenticated");
  return userId;
}

export type DashboardTask = {
  _id: Id<"tasks">;
  title: string;
  category: string;
  priority: string;
  status: string;
  dueDate?: string;
  dueTime?: string;
  _creationTime: number;
};

export type DashboardResult = {
  profile: Doc<"teacherProfiles"> | null;
  attention: DashboardTask[];
  overdue: DashboardTask[];
  dueToday: DashboardTask[];
  upcoming: DashboardTask[];
  stats: { pending: number; inProgress: number; completed: number; overdue: number };
  totalOpen: number;
};

export const getDashboard = query({
  args: {},
  handler: async (ctx): Promise<DashboardResult> => {
    const userId = await requireAuth(ctx);

    const profile = await ctx.db
      .query("teacherProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Local calendar date (server-safe: pure string math on YYYY-MM-DD).
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    const open = tasks.filter((t) => t.status !== "completed");
    const overdue = open.filter((t) => t.dueDate && t.dueDate < today);
    const dueToday = open.filter((t) => t.dueDate === today);

    // Upcoming: due within the next 7 days (excluding today), sorted by date.
    const maxDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);
    const maxDateStr = `${maxDate.getFullYear()}-${String(maxDate.getMonth() + 1).padStart(2, "0")}-${String(maxDate.getDate()).padStart(2, "0")}`;
    const upcoming = open
      .filter((t) => t.dueDate && t.dueDate > today && t.dueDate <= maxDateStr)
      .sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1))
      .slice(0, 5);

    // Attention = overdue first, then due today, then urgent/high no-date.
    const priorityRank: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
    const attention = [...overdue, ...dueToday, ...open.filter((t) => !t.dueDate && (t.priority === "urgent" || t.priority === "high"))]
      .sort((a, b) => {
        const ao = a.dueDate && a.dueDate < today ? 0 : a.dueDate === today ? 1 : 2;
        const bo = b.dueDate && b.dueDate < today ? 0 : b.dueDate === today ? 1 : 2;
        if (ao !== bo) return ao - bo;
        const ap = priorityRank[a.priority] ?? 2;
        const bp = priorityRank[b.priority] ?? 2;
        if (ap !== bp) return ap - bp;
        return a._creationTime - b._creationTime;
      })
      .slice(0, 5);

    const stats = {
      pending: open.filter((t) => t.status === "todo").length,
      inProgress: open.filter((t) => t.status === "in_progress").length,
      completed: tasks.filter((t) => t.status === "completed").length,
      overdue: overdue.length,
    };

    return {
      profile,
      attention,
      overdue,
      dueToday,
      upcoming,
      stats,
      totalOpen: open.length,
    };
  },
});
