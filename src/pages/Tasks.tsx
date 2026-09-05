import { MobileNav, DesktopNav } from "@/components/AppNav";
import { TaskCard } from "@/components/TaskCard";
import { TaskDetailDrawer } from "@/components/TaskDetailDrawer";
import { CreateTaskDialog } from "@/components/TaskFormDialog";
import {
  DEFAULT_FILTERS,
  TaskFilters,
  type TaskFilterState,
} from "@/components/TaskFilters";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  attentionScore,
  attentionReasons,
  daysUntil,
} from "@/lib/attention";
import { PRIORITY_RANK, type Priority } from "@/lib/tasks-shared";
import { useTasks, type TaskItem } from "@/hooks/use-tasks";
import { ListChecks, Plus, SearchX } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";

export default function Tasks() {
  const tasks = useTasks();
  const [searchParams, setSearchParams] = useSearchParams();

  const [filters, setFilters] = useState<TaskFilterState>(DEFAULT_FILTERS);
  const [detailTask, setDetailTask] = useState<TaskItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Support /tasks?new=1 from quick actions. The URL is the source of truth:
  // "Plan/Add" actions set the ?new=1 param, and closing the dialog strips it.
  // Fully derived state — no effects, no render-phase navigation.
  const createOpen = searchParams.get("new") === "1";
  const openCreate = () => {
    const next = new URLSearchParams(searchParams);
    next.set("new", "1");
    setSearchParams(next, { replace: true });
  };
  const closeCreate = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("new");
    setSearchParams(next, { replace: true });
  };

  const visible = useMemo(() => {
    const all = tasks ?? [];
    const q = filters.search.trim().toLowerCase();
    let list = all.filter((t) => {
      if (filters.status !== "all" && t.status !== filters.status) return false;
      if (filters.category !== "all" && t.category !== filters.category) return false;
      if (filters.priority !== "all" && t.priority !== filters.priority) return false;
      if (q) {
        const hay = `${t.title} ${t.description ?? ""} ${t.subtasks.map((s) => s.title).join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    list = [...list].sort((a, b) => {
      switch (filters.sort) {
        case "due": {
          const av = a.dueDate ? daysUntil(a.dueDate) : 99999;
          const bv = b.dueDate ? daysUntil(b.dueDate) : 99999;
          return av - bv;
        }
        case "priority":
          return (
            (PRIORITY_RANK[a.priority as Priority] ?? 2) -
            (PRIORITY_RANK[b.priority as Priority] ?? 2)
          );
        case "created":
          return b._creationTime - a._creationTime;
        case "attention":
        default:
          return attentionScore(b) - attentionScore(a);
      }
    });
    return list;
  }, [tasks, filters]);

  const groups = useMemo(() => {
    const open = visible.filter((t) => t.status !== "completed");
    const completed = visible.filter((t) => t.status === "completed");
    const overdue = open.filter((t) => attentionReasons(t).some((r) => r.tone === "overdue"));
    const today = open.filter((t) => attentionReasons(t).some((r) => r.tone === "today"));
    const upcoming = open.filter(
      (t) => !overdue.includes(t) && !today.includes(t),
    );
    return [
      { key: "overdue", label: "Overdue", items: overdue },
      { key: "today", label: "Due today", items: today },
      { key: "upcoming", label: "Upcoming & unscheduled", items: upcoming },
      ...(filters.status !== "todo" && filters.status !== "in_progress"
        ? [{ key: "completed", label: "Completed", items: completed }]
        : []),
    ].filter((g) => g.items.length > 0);
  }, [visible, filters.status]);

  const openDetail = (t: TaskItem) => {
    setDetailTask(t);
    setDetailOpen(true);
  };

  const loading = tasks === undefined;

  return (
    <div className="min-h-screen bg-background">
      <DesktopNav />
      <MobileNav />

      <main className="md:pl-64">
        <div className="mx-auto w-full max-w-3xl px-4 pb-28 pt-6 md:px-8 md:pb-12 md:pt-10">
          <header className="mb-5 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {loading
                  ? "Loading…"
                  : `${visible.length} ${visible.length === 1 ? "task" : "tasks"}${filters.search ? " matching" : ""}`}
              </p>
            </div>
            <Button className="hidden h-11 gap-2 md:inline-flex" onClick={openCreate}>
              <Plus className="size-4" />
              New task
            </Button>
          </header>

          <div className="sticky top-0 z-10 -mx-4 bg-background/90 px-4 py-2 backdrop-blur md:static md:mx-0 md:bg-transparent md:px-0">
            <TaskFilters filters={filters} onChange={setFilters} />
          </div>

          <div className="mt-4 flex flex-col gap-6">
            {loading ? (
              <div className="flex flex-col gap-2">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : visible.length === 0 ? (
              <EmptyState
                hasTasks={(tasks ?? []).length > 0}
                onAdd={openCreate}
              />
            ) : (
              groups.map((g) => (
                <section key={g.key}>
                  <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
                    {g.label}
                    <span className="ml-1.5 font-normal">{g.items.length}</span>
                  </h2>
                  <div className="flex flex-col gap-2">
                    {g.items.map((t) => (
                      <TaskCard key={t._id} task={t} onOpen={openDetail} />
                    ))}
                  </div>
                </section>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Mobile FAB */}
      <button
        onClick={openCreate}
        aria-label="Add task"
        className="fixed bottom-24 right-4 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/30 active:scale-95 md:hidden"
      >
        <Plus className="size-6" />
      </button>

      <TaskDetailDrawer
        task={detailTask}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
      <CreateTaskDialog open={createOpen} onOpenChange={(o) => (o ? openCreate() : closeCreate())} />
    </div>
  );
}

function EmptyState({ hasTasks, onAdd }: { hasTasks: boolean; onAdd: () => void }) {
  if (!hasTasks) {
    return (
      <div className="card-soft flex flex-col items-center gap-3 p-10 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
          <ListChecks className="size-7" />
        </span>
        <div>
          <p className="font-semibold">No tasks yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your first teaching task — a lesson to plan, essays to grade, or an exam
            to prepare.
          </p>
        </div>
        <Button className="mt-2 h-11" onClick={onAdd}>
          <Plus className="size-4" />
          Add your first task
        </Button>
      </div>
    );
  }
  return (
    <div className="card-soft flex flex-col items-center gap-2 p-10 text-center">
      <SearchX className="size-8 text-muted-foreground" />
      <p className="font-semibold">No matching tasks</p>
      <p className="text-sm text-muted-foreground">
        Try different search words or reset the filters.
      </p>
    </div>
  );
}
