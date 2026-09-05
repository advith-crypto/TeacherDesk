import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { EditTaskDialog } from "./TaskFormDialog";
import { friendlyDate } from "@/lib/attention";
import { STATUS_LABELS, PRIORITY_LABELS, STATUSES, PRIORITIES, CATEGORY_LABELS } from "@/lib/tasks-shared";
import { useTaskMutations, type TaskItem } from "@/hooks/use-tasks";
import {
  Calendar,
  Check,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function TaskDetailDrawer({
  task,
  open,
  onOpenChange,
  onDeleted,
}: {
  task: TaskItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}) {
  const { updateTask, deleteTask, addSubtask, toggleSubtask, deleteSubtask } = useTaskMutations();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [newSub, setNewSub] = useState("");

  if (!task) return null;

  const isCompleted = task.status === "completed";

  const handleDelete = async () => {
    await deleteTask(task._id);
    setConfirmDelete(false);
    onOpenChange(false);
    onDeleted?.();
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92dvh]">
        <div className="mx-auto w-full max-w-lg overflow-y-auto px-4 pb-8">
          <DrawerHeader className="px-0 text-left">
            <DrawerTitle className="text-left text-xl leading-tight">
              {task.title}
            </DrawerTitle>
            {task.description && (
              <DrawerDescription className="text-left">
                {task.description}
              </DrawerDescription>
            )}
          </DrawerHeader>

          <div className="flex flex-col gap-4">
            {/* Quick actions */}
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="h-10 flex-1"
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="size-4" />
                Edit
              </Button>
              <Button
                variant={isCompleted ? "outline" : "default"}
                className="h-10 flex-1"
                onClick={() =>
                  updateTask(task._id, { status: isCompleted ? "todo" : "completed" })
                }
              >
                <Check className="size-4" />
                {isCompleted ? "Reopen" : "Complete"}
              </Button>
              <Button
                variant="ghost"
                className="h-10 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setConfirmDelete(true)}
                aria-label="Delete task"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>

            {/* Fields */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">Status</span>
                <Select
                  value={task.status}
                  onValueChange={(v) => updateTask(task._id, { status: v })}
                >
                  <SelectTrigger aria-label="Change status" className="w-full">
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
              <div className="grid gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">Priority</span>
                <Select
                  value={task.priority}
                  onValueChange={(v) => updateTask(task._id, { priority: v })}
                >
                  <SelectTrigger aria-label="Change priority" className="w-full">
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

            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="size-4" />
                {friendlyDate(task.dueDate)}
                {task.dueTime ? ` · ${task.dueTime}` : ""}
              </span>
              <span>·</span>
              <span>{CATEGORY_LABELS[task.category as keyof typeof CATEGORY_LABELS] ?? "General"}</span>
            </div>

            <Separator />

            {/* Subtasks */}
            <div>
              <p className="mb-2 text-sm font-medium">
                Steps{" "}
                {task.subtasks.length > 0 && (
                  <span className="text-muted-foreground">
                    ({task.subtasks.filter((s) => s.isCompleted).length}/{task.subtasks.length})
                  </span>
                )}
              </p>
              <ul className="flex flex-col gap-2">
                {task.subtasks.map((s) => (
                  <li
                    key={s._id}
                    className="flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2"
                  >
                    <button
                      aria-label={s.isCompleted ? `Undo ${s.title}` : `Complete ${s.title}`}
                      onClick={() => toggleSubtask(s._id)}
                      className={
                        s.isCompleted
                          ? "flex size-5 items-center justify-center rounded-full border border-primary bg-primary text-primary-foreground"
                          : "size-5 rounded-full border border-border"
                      }
                    >
                      {s.isCompleted && <Check className="size-3" />}
                    </button>
                    <span
                      className={
                        "flex-1 text-sm " + (s.isCompleted ? "text-muted-foreground line-through" : "")
                      }
                    >
                      {s.title}
                    </span>
                    <button
                      aria-label={`Remove ${s.title}`}
                      onClick={() => deleteSubtask(s._id)}
                      className="rounded p-1 text-muted-foreground hover:text-destructive"
                    >
                      <X className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
              <form
                className="mt-2 flex gap-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const t = newSub.trim();
                  if (!t) return;
                  await addSubtask(task._id, t);
                  setNewSub("");
                }}
              >
                <Input
                  value={newSub}
                  onChange={(e) => setNewSub(e.target.value)}
                  placeholder="Add a step…"
                  aria-label="New subtask"
                />
                <Button type="submit" variant="secondary" size="icon" aria-label="Add step">
                  <Plus className="size-4" />
                </Button>
              </form>
            </div>
          </div>
        </div>

        <EditTaskDialog open={editOpen} onOpenChange={setEditOpen} task={task} />

        <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this task?</AlertDialogTitle>
              <AlertDialogDescription>
                “{task.title}” and its steps will be permanently removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-white hover:bg-destructive/90"
                onClick={(e) => {
                  e.preventDefault();
                  handleDelete();
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DrawerContent>
    </Drawer>
  );
}
