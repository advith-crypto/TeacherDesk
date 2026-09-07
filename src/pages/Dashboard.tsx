import { MobileNav, DesktopNav } from "@/components/AppNav";
import { TaskCard } from "@/components/TaskCard";
import { TaskDetailDrawer } from "@/components/TaskDetailDrawer";
import { CreateTaskDialog } from "@/components/TaskFormDialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useProfile, useTasks, type TaskItem } from "@/hooks/use-tasks";
import { useLessonSummary } from "@/hooks/use-lessons";
import { useCorrectionSummary } from "@/hooks/use-corrections";
import { deadlineBucket } from "@/lib/corrections-shared";
import { useQuestionPaperSummary } from "@/hooks/use-question-papers";
import { useTimetableSummary } from "@/hooks/use-timetable";
import { useSeatingSummary } from "@/hooks/use-exam-seating";
import { formatTime12 } from "@/lib/timetable-shared";
import {
  attentionScore,
  attentionReasons,
  friendlyDate,
} from "@/lib/attention";
import {
  AlertTriangle,
  Armchair,
  BookOpen,
  ClipboardCheck,
  ClipboardList,
  CalendarClock,
  ListChecks,
  Plus,
  Sparkles,
  Sun,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { Link, useNavigate } from "react-router";

const QUICK_ACTIONS = [
  { label: "Add task", icon: Plus, to: "/tasks?new=1" },
  { label: "Plan lesson", icon: BookOpen, to: "/lessons?new=1" },
  { label: "Correct papers", icon: ClipboardCheck, to: "/corrections?new=1" },
  { label: "Question paper", icon: ClipboardList, to: "/question-papers?new=1" },
  { label: "Timetable", icon: CalendarClock, to: "/timetable" },
  { label: "Exam seating", icon: Armchair, to: "/exam-seating" },
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
  const activities = useQuery(api.tasks.listActivities, { limit: 6 });
  const lessonSummary = useLessonSummary();
  const correctionSummary = useCorrectionSummary();
  const questionPaperSummary = useQuestionPaperSummary();
  const timetableSummary = useTimetableSummary();
  const seatingSummary = useSeatingSummary();

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

  // Deterministic focus answer: overdue tasks, then due-today tasks, then
  // today's lessons, then a general nudge. No AI — pure date/status logic.
  const focusText = useMemo(() => {
    if (overdue.length > 0)
      return `${overdue.length} overdue ${overdue.length === 1 ? "task needs" : "tasks need"} you first`;
    if (dueToday.length > 0)
      return `${dueToday.length} ${dueToday.length === 1 ? "task is" : "tasks are"} due today`;
    const todaysLessons = lessonSummary?.todays.length ?? 0;
    if (todaysLessons > 0)
      return `${todaysLessons} ${todaysLessons === 1 ? "lesson" : "lessons"} to teach today`;
    const corrOverdue = correctionSummary?.overdue ?? 0;
    if (corrOverdue > 0)
      return `${corrOverdue} ${corrOverdue === 1 ? "correction batch" : "correction batches"} overdue — check the Corrections tracker`;
    const corrDueToday = correctionSummary?.dueToday ?? 0;
    if (corrDueToday > 0)
      return `${corrDueToday} ${corrDueToday === 1 ? "correction is" : "corrections are"} due today`;
    const qpOverdue = questionPaperSummary?.overdue ?? 0;
    if (qpOverdue > 0)
      return `${qpOverdue} ${qpOverdue === 1 ? "paper" : "papers"} have overdue preparation — check Question Papers`;
    const qpDueToday = questionPaperSummary?.dueToday ?? 0;
    if (qpDueToday > 0)
      return `${qpDueToday} ${qpDueToday === 1 ? "paper" : "papers"} need finishing today`;
    const teachingNow = timetableSummary?.current;
    if (teachingNow)
      return `You're teaching now — ${teachingNow.subject}, ${teachingNow.classGrade}`;
    const classesToday = timetableSummary?.todayCount ?? 0;
    if (classesToday > 0)
      return `${classesToday} ${classesToday === 1 ? "class" : "classes"} on today's timetable`;
    if (openTasks.length > 0) return "You're on top of things — pick your next task";
    return "Nothing pending. Enjoy the calm!";
  }, [overdue.length, dueToday.length, lessonSummary, correctionSummary, questionPaperSummary, timetableSummary, openTasks.length]);

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
              <p className="mt-0.5 font-semibold leading-snug">{focusText}</p>
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

          {/* Today's lessons */}
          <section className="mb-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-base font-semibold">
                <BookOpen className="size-4 text-primary" />
                Today's lessons
                {lessonSummary && lessonSummary.todays.length > 0 && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    {lessonSummary.todays.length}
                  </span>
                )}
              </h2>
              <Link to="/lessons" className="text-sm font-medium text-primary">
                Lesson planner
              </Link>
            </div>
            {lessonSummary === undefined ? (
              <Skeleton className="h-20 w-full" />
            ) : lessonSummary.todays.length === 0 && !lessonSummary.next ? (
              <div className="card-soft flex items-center gap-3 p-4">
                <BookOpen className="size-5 shrink-0 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No lessons today. Plan your next class from the Lesson Planner.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {lessonSummary.todays.map((l) => (
                  <DashboardLessonRow key={l._id} lesson={l} chip="Today" />
                ))}
                {lessonSummary.todays.length === 0 && lessonSummary.next && (
                  <DashboardLessonRow lesson={lessonSummary.next} chip="Next" />
                )}
                {lessonSummary.plannedThisWeek > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {lessonSummary.plannedThisWeek} {lessonSummary.plannedThisWeek === 1 ? "lesson" : "lessons"} planned this week
                  </p>
                )}
              </div>
            )}
          </section>

          {/* Corrections */}
          <section className="mb-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-base font-semibold">
                <ClipboardCheck className="size-4 text-primary" />
                Corrections
                {correctionSummary && correctionSummary.active > 0 && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    {correctionSummary.active}
                  </span>
                )}
              </h2>
              <Link to="/corrections" className="text-sm font-medium text-primary">
                View corrections
              </Link>
            </div>
            {correctionSummary === undefined ? (
              <Skeleton className="h-20 w-full" />
            ) : correctionSummary.active === 0 ? (
              <div className="card-soft flex items-center gap-3 p-4">
                <ClipboardCheck className="size-5 shrink-0 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No corrections need attention right now.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-[13px] text-muted-foreground">
                  {correctionSummary.papersRemaining}{" "}
                  {correctionSummary.papersRemaining === 1 ? "paper" : "papers"}{" "}
                  remaining across {correctionSummary.active}{" "}
                  {correctionSummary.active === 1 ? "correction" : "corrections"}
                  {correctionSummary.dueToday > 0 && (
                    <>
                      {" "}· {correctionSummary.dueToday} due today
                    </>
                  )}
                </p>
                {correctionSummary.attention.slice(0, 2).map((c) => (
                  <DashboardCorrectionRow key={c._id} correction={c} />
                ))}
              </div>
            )}
          </section>

          {/* Question papers */}
          <section className="mb-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-base font-semibold">
                <ClipboardList className="size-4 text-primary" />
                Question papers
                {questionPaperSummary && questionPaperSummary.draft + questionPaperSummary.ready > 0 && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    {questionPaperSummary.draft + questionPaperSummary.ready}
                  </span>
                )}
              </h2>
              <Link to="/question-papers" className="text-sm font-medium text-primary">
                Question papers
              </Link>
            </div>
            {questionPaperSummary === undefined ? (
              <Skeleton className="h-20 w-full" />
            ) : questionPaperSummary.active === 0 ? (
              <div className="card-soft flex items-center gap-3 p-4">
                <ClipboardList className="size-5 shrink-0 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No question-paper prep needs attention right now.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-[13px] text-muted-foreground">
                  {questionPaperSummary.draft > 0 && (
                    <>
                      {questionPaperSummary.draft} in Draft
                      {questionPaperSummary.overdue > 0 || questionPaperSummary.nextExam ? " · " : ""}
                    </>
                  )}
                  {questionPaperSummary.overdue > 0 && (
                    <>
                      {questionPaperSummary.overdue} overdue
                      {questionPaperSummary.nextExam ? " · " : ""}
                    </>
                  )}
                  {questionPaperSummary.nextExam && (
                    <>Next exam {friendlyDate(questionPaperSummary.nextExam.examDate!)}</>
                  )}
                </p>
                {questionPaperSummary.attention.slice(0, 2).map((p) => (
                  <DashboardQuestionPaperRow key={p._id} paper={p} />
                ))}
              </div>
            )}
          </section>

          {/* Timetable */}
          <section className="mb-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-base font-semibold">
                <CalendarClock className="size-4 text-primary" />
                Timetable
                {timetableSummary && timetableSummary.todayCount > 0 && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    {timetableSummary.todayCount}
                  </span>
                )}
              </h2>
              <Link to="/timetable" className="text-sm font-medium text-primary">
                Open timetable
              </Link>
            </div>
            {timetableSummary === undefined ? (
              <Skeleton className="h-20 w-full" />
            ) : timetableSummary.total === 0 ? (
              <div className="card-soft flex items-center gap-3 p-4">
                <CalendarClock className="size-5 shrink-0 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No periods scheduled yet. Add your teaching schedule to see today's classes.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-[13px] text-muted-foreground">
                  {timetableSummary.todayCount} {""}
                  {timetableSummary.todayCount === 1 ? "class" : "classes"} today
                  {timetableSummary.current
                    ? " · teaching now"
                    : timetableSummary.next
                      ? ` · next at ${formatTime12(timetableSummary.next.startTime)}`
                      : ""}
                </p>
                {timetableSummary.current && (
                  <DashboardTimetableRow
                    entry={timetableSummary.current}
                    chip="Now"
                  />
                )}
                {timetableSummary.next && (
                  <DashboardTimetableRow entry={timetableSummary.next} chip="Next" />
                )}
              </div>
            )}
          </section>

          {/* Exam seating */}
          <section className="mb-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-base font-semibold">
                <Users className="size-4 text-primary" />
                Exam seating
                {seatingSummary && seatingSummary.draft + seatingSummary.ready > 0 && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    {seatingSummary.draft + seatingSummary.ready}
                  </span>
                )}
              </h2>
              <Link to="/exam-seating" className="text-sm font-medium text-primary">
                Open seating
              </Link>
            </div>
            {seatingSummary === undefined ? (
              <Skeleton className="h-20 w-full" />
            ) : seatingSummary.nextPlan ? (
              <div className="flex flex-col gap-2">
                <p className="text-[13px] text-muted-foreground">
                  Next exam {friendlyDate(seatingSummary.nextPlan.examDate)}
                  {seatingSummary.nextPlan.room
                    ? ` · ${seatingSummary.nextPlan.room}`
                    : ""}
                </p>
                <DashboardSeatingRow plan={seatingSummary.nextPlan} />
              </div>
            ) : (
              <div className="card-soft flex items-center gap-3 p-4">
                <Users className="size-5 shrink-0 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No upcoming seating plans. Create one when an exam is near.
                </p>
              </div>
            )}
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

/**
 * Compact question-paper row for the dashboard. Deterministic prep-deadline
 * chip from real data: Overdue / Due today / Due soon / Upcoming.
 */
function DashboardQuestionPaperRow({
  paper,
}: {
  paper: {
    _id: Id<"questionPapers">;
    title: string;
    subject: string;
    classGrade: string;
    examType: string;
    examDate?: string;
    preparationDeadline?: string;
    status: string;
    priority: string;
  };
}) {
  const navigate = useNavigate();
  const today = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();
  const pd = paper.preparationDeadline;
  const chip = !pd
    ? { label: "No deadline", cls: "bg-secondary text-muted-foreground" }
    : pd < today
      ? { label: "Overdue", cls: "bg-destructive/10 text-destructive" }
      : pd === today
        ? { label: "Due today", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400" }
        : pd <= (() => {
            const d = new Date(today + "T00:00:00");
            d.setDate(d.getDate() + 3);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          })()
          ? { label: "Due soon", cls: "bg-sky-500/10 text-sky-700 dark:text-sky-400" }
          : { label: "Upcoming", cls: "bg-secondary text-muted-foreground" };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Question paper: ${paper.title}`}
      onClick={() => navigate("/question-papers")}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate("/question-papers");
        }
      }}
      className="card-soft card-soft-hover flex w-full cursor-pointer flex-col gap-0.5 p-4 text-left"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 font-medium leading-5">{paper.title}</p>
        <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium", chip.cls)}>
          {chip.label}
        </span>
      </div>
      <p className="truncate text-[13px] text-muted-foreground">
        {paper.subject} · {paper.classGrade} · {paper.examType}
        {paper.examDate ? ` · Exam ${friendlyDate(paper.examDate)}` : ""}
      </p>
    </div>
  );
}

/**
 * Compact correction row for the dashboard. Deterministic deadline chip from
 * real data: Overdue / Due today / Due soon / Upcoming.
 */
function DashboardCorrectionRow({
  correction,
}: {
  correction: {
    _id: Id<"corrections">;
    title: string;
    subject: string;
    classGrade: string;
    assessmentType: string;
    correctionDeadline: string;
    totalPapers: number;
    correctedPapers: number;
    status: string;
    priority: string;
  };
}) {
  const navigate = useNavigate();
  const bucket = deadlineBucket(correction);
  const chip =
    bucket === "overdue"
      ? { label: "Overdue", cls: "bg-destructive/10 text-destructive" }
      : bucket === "today"
        ? { label: "Due today", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400" }
        : bucket === "soon"
          ? { label: "Due soon", cls: "bg-sky-500/10 text-sky-700 dark:text-sky-400" }
          : { label: "Upcoming", cls: "bg-secondary text-muted-foreground" };
  const pct =
    correction.totalPapers > 0
      ? Math.min(
          100,
          Math.max(
            0,
            Math.round((correction.correctedPapers / correction.totalPapers) * 100),
          ),
        )
      : 0;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Correction: ${correction.title}`}
      onClick={() => navigate("/corrections")}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate("/corrections");
        }
      }}
      className="card-soft card-soft-hover flex w-full cursor-pointer flex-col gap-1.5 p-4 text-left"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 font-medium leading-5">{correction.title}</p>
        <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium", chip.cls)}>
          {chip.label}
        </span>
      </div>
      <p className="truncate text-[13px] text-muted-foreground">
        {correction.subject} · {correction.classGrade} · {correction.assessmentType}
      </p>
      <div className="flex items-center gap-2">
        <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-primary/10" aria-hidden>
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {correction.correctedPapers} / {correction.totalPapers} corrected
        </span>
      </div>
    </div>
  );
}

/**
 * Compact timetable row for the dashboard — the current or next class today,
 * computed server-side from the user's schedule and the local clock.
 */
function DashboardTimetableRow({
  entry,
  chip,
}: {
  entry: {
    _id: Id<"timetableEntries">;
    startTime: string;
    endTime: string;
    subject: string;
    classGrade: string;
    section?: string;
    room?: string;
  };
  chip: "Now" | "Next";
}) {
  const navigate = useNavigate();

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${chip} class: ${entry.subject}, ${entry.classGrade}`}
      onClick={() => navigate("/timetable")}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate("/timetable");
        }
      }}
      className="card-soft card-soft-hover flex w-full cursor-pointer items-center gap-3 p-4 text-left"
    >
      <span
        className={cn(
          "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold",
          chip === "Now"
            ? "bg-primary text-primary-foreground"
            : "bg-sky-500/15 text-sky-700 dark:text-sky-400",
        )}
      >
        {chip}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium leading-5">
          {entry.subject} · {entry.classGrade}
          {entry.section ? ` · ${entry.section}` : ""}
        </p>
        <p className="truncate text-[13px] text-muted-foreground">
          {formatTime12(entry.startTime)} – {formatTime12(entry.endTime)}
          {entry.room ? ` · ${entry.room}` : ""}
        </p>
      </div>
    </div>
  );
}

/**
 * Compact exam-seating row for the dashboard — the next upcoming plan with
 * its real assigned/total seat counts.
 */
function DashboardSeatingRow({
  plan,
}: {
  plan: {
    _id: Id<"examSeatingPlans">;
    title: string;
    examName: string;
    examDate: string;
    room?: string;
    rows: number;
    columns: number;
    assignedCount: number;
    status: string;
  };
}) {
  const navigate = useNavigate();
  const cap = plan.rows * plan.columns;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Seating plan: ${plan.title}`}
      onClick={() => navigate(`/exam-seating/${plan._id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate(`/exam-seating/${plan._id}`);
        }
      }}
      className="card-soft card-soft-hover flex w-full cursor-pointer flex-col gap-0.5 p-4 text-left"
    >
      <p className="truncate font-medium leading-5">{plan.title}</p>
      <p className="truncate text-[13px] text-muted-foreground">
        {plan.examName} · {plan.assignedCount} of {cap} seats filled
      </p>
    </div>
  );
}

/**
 * Compact lesson row for the dashboard. Deterministic chip from real data:
 * "Today" for today's lessons, "Next" for the next upcoming lesson.
 */
function DashboardLessonRow({
  lesson,
  chip,
}: {
  lesson: {
    _id: Id<"lessons">;
    title: string;
    subject: string;
    classGrade: string;
    section?: string;
    topic: string;
  };
  chip: "Today" | "Next";
}) {
  const navigate = useNavigate();

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Lesson: ${lesson.title}`}
      onClick={() => navigate("/lessons")}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate("/lessons");
        }
      }}
      className="card-soft card-soft-hover flex w-full cursor-pointer flex-col gap-0.5 p-4 text-left"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 font-medium leading-5">{lesson.title}</p>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
            chip === "Today"
              ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
              : "bg-sky-500/10 text-sky-700 dark:text-sky-400",
          )}
        >
          {chip}
        </span>
      </div>
      <p className="truncate text-[13px] text-muted-foreground">
        {lesson.subject} · {lesson.classGrade}
        {lesson.section ? ` · ${lesson.section}` : ""} · {lesson.topic}
      </p>
    </div>
  );
}
