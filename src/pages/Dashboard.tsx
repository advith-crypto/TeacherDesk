import { MobileNav, DesktopNav } from "@/components/AppNav";
import { TaskCard } from "@/components/TaskCard";
import { TaskDetailDrawer } from "@/components/TaskDetailDrawer";
import { CreateTaskDialog } from "@/components/TaskFormDialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { friendlyDate } from "@/lib/attention";
import { useAuth } from "@/hooks/use-auth";
import { useProfile, useTasks, type TaskItem } from "@/hooks/use-tasks";
import {
  attentionScore,
  attentionReasons,
} from "@/lib/attention";
import {
  AlertTriangle,
  BookOpen,
  ClipboardCheck,
  ClipboardList,
  CalendarClock,
  ListChecks,
  Pencil,
  Plus,
  Sparkles,
  Sun,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { Link, useNavigate } from "react-router";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";

const QUICK_ACTIONS = [
  { label: "Add task", icon: Plus, to: "/tasks?new=1" },
  { label: "Plan lesson", icon: BookOpen, to: "/lessons" },
  { label: "Add correction", icon: ClipboardCheck, to: "/corrections" },
  { label: "Question paper", icon: ClipboardList, to: "/question-papers" },
  { label: "Timetable", icon: CalendarClock, to: "/timetable" },
  { label: "Exam seating", icon: ClipboardList, to: "/exam-seating" },
] as const;

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function Dashboard() {
  const { user } = useAuth();
  const profile = useProfile();
  const tasks = useTasks();
  const navigate = useNavigate();
  const activities = useQuery(api.tasks.listActivities, { limit: 6 });

  const [detailTask, setDetailTask] = useState<TaskItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [newTaskOpen, setNewTaskOpen] = useState(false);

  const today = new Date();
  const dateLabel = today.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const openTasks = useMemo(() => tasks?.filter((t) => t.status !== "completed") ?? [], [tasks]);

  const overdue = useMemo(
    () => openTasks.filter((t) => attentionReasons(t).some((r) => r.tone === "overdue")),
    [openTasks],
  );
  const dueToday = useMemo(
    () => openTasks.filter((t) => attentionReasons(t).some((r) => r.tone === "today")),
    [openTasks],
  );
  const upcoming = useMemo(
    () =>
      openTasks
        .filter((t) => attentionReasons(t).some((r) => r.tone === "soon"))
        .sort((a, b) => attentionScore(b) - attentionScore(a))
        .slice(0, 3),
    [openTasks],
  );

  const stats = useMemo(() => {
    const all = tasks ?? [];
    return {
      pending: all.filter((t) => t.status === "todo").length,
      inProgress: all.filter((t) => t.status === "in_progress").length,
      completed: all.filter((t) => t.status === "completed").length,
      overdue: overdue.length,
    };
  }, [tasks, overdue.length]);

  const attention = useMemo(
    () =>
      [...openTasks]
        .sort((a, b) => attentionScore(b) - attentionScore(a))
        .slice(0, 3),
    [openTasks],
  );

  const openDetail = (t: TaskItem) => {
    setDetailTask(t);
    setDetailOpen(true);
  };

  const firstName = (profile?.fullName ?? user?.name ?? "Teacher").split(" ")[0];

  return (
    <div className="min-h-screen bg-background">
      <DesktopNav />
      <MobileNav />

      <main className="md:pl-64">
        <div className="mx-auto w-full max-w-3xl px-4 pb-28 pt-6 md:px-8 md:pb-12 md:pt-10">
          {/* Header */}
          <header className="mb-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">{dateLabel}</p>
                <h1 className="mt-0.5 text-2xl font-bold tracking-tight md:text-3xl">
                  {greeting()}, {firstName}
                </h1>
              </div>
              <Link
                to="/settings"
                aria-label="Settings"
                className="flex size-11 items-center justify-center rounded-full border border-border bg-card text-sm font-semibold"
              >
                {(profile?.fullName ?? user?.name ?? "T").charAt(0).toUpperCase()}
              </Link>
            </div>
          </header>

          {/* Primary question */}
          <section className="card-soft mb-6 flex items-center gap-4 bg-gradient-to-br from-primary to-indigo-600 p-5 text-primary-foreground">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/15">
              <Sparkles className="size-6" />
            </span>
            <div>
              <p className="text-sm opacity-90">Your focus for today</p>
              <p className="mt-0.5 font-semibold leading-snug">
                {overdue.length > 0
                  ? `${overdue.length} overdue ${overdue.length === 1 ? "task needs" : "tasks need"} you first`
                  : dueToday.length > 0
                    ? `${dueToday.length} ${dueToday.length === 1 ? "task is" : "tasks are"} due today`
                    : openTasks.length > 0
                      ? "You're on top of things — pick your next task"
                      : "Nothing pending. Enjoy the calm!"}
              </p>
              {!profile && (
                <Link
                  to="/onboarding"
                  className="mt-1 inline-block text-xs underline opacity-90"
                >
                  Finish setting up your profile →
                </Link>
              )}
            </div>
          </section>

          {/* Stats */}
          <section className="mb-6 grid grid-cols-4 gap-2 sm:gap-3" aria-label="Task statistics">
            {[
              { label: "Pending", value: stats.pending, cls: "text-foreground" },
              { label: "Active", value: stats.inProgress, cls: "text-sky-600 dark:text-sky-400" },
              { label: "Done", value: stats.completed, cls: "text-emerald-600 dark:text-emerald-400" },
              { label: "Overdue", value: stats.overdue, cls: "text-destructive" },
            ].map((s) => (
              <div key={s.label} className="card-soft px-2 py-3 text-center sm:px-3">
                <p className={`text-xl font-bold tabular-nums sm:text-2xl ${s.cls}`}>
                  {s.value}
                </p>
                <p className="mt-0.5 text-[11px] font-medium text-muted-foreground sm:text-xs">
                  {s.label}
                </p>
              </div>
            ))}
          </section>

          {/* Quick actions */}
          <section className="mb-8" aria-label="Quick actions">
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Quick actions</h2>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {QUICK_ACTIONS.map((a) => (
                <Link
                  key={a.label}
                  to={a.to}
                  className="card-soft card-soft-hover flex min-h-[4.5rem] flex-col items-center justify-center gap-1.5 p-2 text-center"
                >
                  <a.icon className="size-5 text-primary" />
                  <span className="text-[11px] font-medium leading-tight">{a.label}</span>
                </Link>
              ))}
            </div>
          </section>

          {/* Attention */}
          <section className="mb-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">Needs your attention</h2>
              <Link to="/tasks" className="text-sm font-medium text-primary">
                All tasks
              </Link>
            </div>
            {tasks === undefined ? (
              <div className="flex flex-col gap-2">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : attention.length === 0 ? (
              <div className="card-soft flex flex-col items-center gap-2 p-6 text-center">
                <Sun className="size-6 text-amber-500" />
                <p className="text-sm text-muted-foreground">
                  Nothing urgent. Add a task to get started.
                </p>
                <Button size="sm" className="mt-1" onClick={() => setNewTaskOpen(true)}>
                  <Plus className="size-4" />
                  Add task
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {attention.map((t) => (
                  <TaskCard key={t._id} task={t} onOpen={openDetail} />
                ))}
              </div>
            )}
          </section>

          {/* Overdue + Today */}
          <section className="mb-8 grid gap-6 sm:grid-cols-2">
            <div>
              <h2 className="mb-3 flex items-center gap-1.5 text-base font-semibold">
                <AlertTriangle className="size-4 text-destructive" />
                Overdue
                {overdue.length > 0 && (
                  <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
                    {overdue.length}
                  </span>
                )}
              </h2>
              <div className="flex flex-col gap-2">
                {tasks !== undefined && overdue.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nothing overdue. 🎉</p>
                )}
                {overdue.slice(0, 3).map((t) => (
                  <TaskCard key={t._id} task={t} onOpen={openDetail} />
                ))}
              </div>
            </div>
            <div>
              <h2 className="mb-3 flex items-center gap-1.5 text-base font-semibold">
                <CalendarClock className="size-4 text-amber-500" />
                Due today
                {dueToday.length > 0 && (
                  <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                    {dueToday.length}
                  </span>
                )}
              </h2>
              <div className="flex flex-col gap-2">
                {tasks !== undefined && dueToday.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nothing due today.</p>
                )}
                {dueToday.slice(0, 3).map((t) => (
                  <TaskCard key={t._id} task={t} onOpen={openDetail} />
                ))}
              </div>
            </div>
          </section>

          {/* Upcoming deadlines */}
          <section className="mb-8">
            <h2 className="mb-3 text-base font-semibold">Upcoming deadlines</h2>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">No deadlines in the next few days.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {upcoming.map((t) => (
                  <TaskCard key={t._id} task={t} onOpen={openDetail} />
                ))}
              </div>
            )}
          </section>

          {/* Recent activity */}
          <section>
            <h2 className="mb-3 flex items-center gap-1.5 text-base font-semibold">
              <ListChecks className="size-4" />
              Recent activity
            </h2>
            {activities === undefined ? (
              <Skeleton className="h-24 w-full" />
            ) : activities.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Your actions will show up here.
              </p>
            ) : (
              <div className="card-soft divide-y divide-border/60">
                {activities.map((a) => (
                  <div key={a._id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <span className="min-w-0 truncate text-sm">{a.summary}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {friendlyTime(a._creationTime)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <footer className="mt-12 text-center text-xs text-muted-foreground">
            TeacherDesk · Built by THOTA ADVITH
          </footer>
        </div>
      </main>

      <TaskDetailDrawer
        task={detailTask}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
      <CreateTaskDialog open={newTaskOpen} onOpenChange={setNewTaskOpen} />
    </div>
  );
}

function friendlyTime(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}
