import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORIES, CATEGORY_LABELS, PRIORITIES, PRIORITY_LABELS, STATUSES, STATUS_LABELS } from "@/lib/tasks-shared";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { useTaskMutations } from "@/hooks/use-tasks";
import type { Id } from "@/convex/_generated/dataModel";
import type { TaskItem } from "@/hooks/use-tasks";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: TaskItem;
  defaults?: {
    category?: string;
    status?: string;
  };
  onSaved?: () => void;
};

/** Create/edit task dialog — mobile-first, large touch targets. */
export function TaskFormDialog({ open, onOpenChange, task, defaults, onSaved }: Props) {
  const { createTask, updateTask, pending } = useTaskMutations();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [priority, setPriority] = useState("medium");
  const [status, setStatus] = useState("todo");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [newSub, setNewSub] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTitle(task?.title ?? "");
      setDescription(task?.description ?? "");
      setCategory(task?.category ?? defaults?.category ?? "general");
      setPriority(task?.priority ?? "medium");
      setStatus(task?.status ?? defaults?.status ?? "todo");
      setDueDate(task?.dueDate ?? "");
      setDueTime(task?.dueTime ?? "");
      setSubtasks(task ? task.subtasks.map((s) => s.title) : []);
      setNewSub("");
      setError(null);
    }
  }, [open, task, defaults?.category, defaults?.status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please give the task a title.");
      return;
    }
    try {
      if (task) {
        await updateTask(task._id, {
          title,
          description: description || null,
          category,
          priority,
          status,
          dueDate: dueDate || null,
          dueTime: dueTime || null,
        });
      } else {
        await createTask({
          title,
          description: description || undefined,
          category,
          priority,
          status,
          dueDate: dueDate || undefined,
          dueTime: dueTime || undefined,
          subtasks: subtasks.map((t) => ({ title: t })),
        });
      }
      onOpenChange(false);
      onSaved?.();
    } catch {
      // toast shown by hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{task ? "Edit task" : "New task"}</DialogTitle>
          <DialogDescription>
            {task ? "Update the details of this task." : "Add teaching work you need to track."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Grade Class 9 essays"
              autoCapitalize="sentences"
              required
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="task-desc">Description (optional)</Label>
            <Textarea
              id="task-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Any details…"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full" aria-label="Category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="w-full" aria-label="Priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {PRIORITY_LABELS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="task-date">Due date (optional)</Label>
              <Input
                id="task-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="task-time">Due time (optional)</Label>
              <Input
                id="task-time"
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full" aria-label="Status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!task && (
            <div className="grid gap-1.5">
              <Label htmlFor="task-sub">Subtasks (optional)</Label>
              {subtasks.length > 0 && (
                <ul className="flex flex-col gap-1">
                  {subtasks.map((s, i) => (
                    <li
                      key={`${s}-${i}`}
                      className="flex items-center justify-between rounded-lg bg-secondary px-3 py-2 text-sm"
                    >
                      <span>{s}</span>
                      <button
                        type="button"
                        aria-label={`Remove subtask ${s}`}
                        className="rounded p-1 text-muted-foreground hover:text-foreground"
                        onClick={() => setSubtasks((prev) => prev.filter((_, idx) => idx !== i))}
                      >
                        <X className="size-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2">
                <Input
                  id="task-sub"
                  value={newSub}
                  onChange={(e) => setNewSub(e.target.value)}
                  placeholder="Add a step…"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const t = newSub.trim();
                      if (t) {
                        setSubtasks((prev) => [...prev, t]);
                        setNewSub("");
                      }
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    const t = newSub.trim();
                    if (t) {
                      setSubtasks((prev) => [...prev, t]);
                      setNewSub("");
                    }
                  }}
                >
                  Add
                </Button>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter className="mt-1 flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="ghost"
              className="w-full sm:w-auto"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="w-full sm:w-auto" disabled={pending}>
              {task ? "Save changes" : "Create task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CreateTaskDialog(
  props: Omit<Props, "task"> & { onCreated?: () => void },
) {
  return <TaskFormDialog {...props} onSaved={props.onCreated} />;
}

export function EditTaskDialog(props: Omit<Props, "defaults">) {
  return <TaskFormDialog {...props} />;
}

export type { Props as TaskFormDialogProps };
export type { Id };
