import { Button } from "@/components/ui/button";
import { attentionReasons, friendlyDate } from "@/lib/attention";
import { CATEGORY_ICONS, CATEGORY_LABELS, PRIORITY_LABELS, STATUS_LABELS, type Category, type Priority } from "@/lib/tasks-shared";
import { cn } from "@/lib/utils";
import type { Category as _C, Priority as _P } from "@/lib/tasks-shared";
import { Check, Clock } from "lucide-react";
import { useTaskMutations, type TaskItem } from "@/hooks/use-tasks";
import type { Category as CatType, Priority as PriType } from "@/lib/tasks-shared";

const reasonToneClasses: Record<string, string> = {
  overdue: "bg-destructive/10 text-destructive",
  today: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  soon: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  priority: "bg-accent text-accent-foreground",
  none: "bg-secondary text-muted-foreground",
};

export function TaskCard({
  task,
  onOpen,
}: {
  task: TaskItem;
  onOpen: (task: TaskItem) => void;
}) {
  const { updateTask } = useTaskMutations();
  const isCompleted = task.status === "completed";
  const reasons = attentionReasons(task);
  const Icon = CATEGORY_ICONS[(task.category as CatType) ?? "general"] ?? CATEGORY_ICONS.general;

  const toggleComplete = async () => {
    await updateTask(task._id, {
      status: isCompleted ? "todo" : "completed",
    });
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Task: ${task.title}`}
      onClick={() => onOpen(task)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(task);
        }
      }}
      className={cn(
        "card-soft card-soft-hover flex w-full cursor-pointer items-start gap-3 p-4 text-left",
        isCompleted && "opacity-60",
      )}
    >
      {/* Complete toggle */}
      <button
        aria-label={isCompleted ? "Mark as not done" : "Mark as done"}
        onClick={(e) => {
          e.stopPropagation();
          toggleComplete();
        }}
        className={cn(
          "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors",
          isCompleted
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border hover:border-primary",
        )}
      >
        {isCompleted && <Check className="size-4" />}
      </button>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate font-medium leading-5",
            isCompleted && "line-through",
          )}
        >
          {task.title}
        </p>

        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {/* Attention reason chips (explainable logic) */}
          {reasons.map((r) => (
            <span
              key={r.label}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                reasonToneClasses[r.tone],
              )}
            >
              {r.tone === "overdue" || r.tone === "today" ? (
                <Clock className="size-3" />
              ) : null}
              {r.label}
            </span>
          ))}
          {reasons.length === 0 && task.dueDate && (
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
              <Clock className="size-3" />
              {friendlyDate(task.dueDate)}
              {task.dueTime ? ` · ${task.dueTime}` : ""}
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
            <Icon className="size-3" />
            {CATEGORY_LABELS[task.category as CatType] ?? "General"}
          </span>
          {task.subtasks.length > 0 && (
            <span className="text-[11px] text-muted-foreground">
              {task.subtasks.filter((s) => s.isCompleted).length}/{task.subtasks.length} steps
            </span>
          )}
        </div>
      </div>

      {/* Priority dot */}
      <span
        aria-label={`Priority: ${PRIORITY_LABELS[task.priority as PriType]}`}
        title={`Priority: ${PRIORITY_LABELS[task.priority as PriType]}`}
        className={cn(
          "mt-1 size-2 shrink-0 rounded-full",
          task.priority === "urgent" && "bg-destructive",
          task.priority === "high" && "bg-amber-500",
          task.priority === "medium" && "bg-sky-500",
          task.priority === "low" && "bg-emerald-500",
        )}
      />
    </div>
  );
}
