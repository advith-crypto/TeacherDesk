import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { EditLessonDialog } from "./LessonFormDialog";
import { friendlyDate } from "@/lib/attention";
import {
  LESSON_PRIORITIES,
  LESSON_PRIORITY_LABELS,
  LESSON_STATUSES,
  LESSON_STATUS_LABELS,
} from "@/lib/lessons-shared";
import { useLessonMutations, type LessonItem } from "@/hooks/use-lessons";
import { BookOpen, Check, Clock, Pencil, Timer, Trash2 } from "lucide-react";
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

function FieldBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <p className="whitespace-pre-wrap break-words text-sm">{value}</p>
    </div>
  );
}

/** Lesson detail bottom sheet — view all fields, edit, status, delete. */
export function LessonDetailDrawer({
  lesson,
  open,
  onOpenChange,
}: {
  lesson: LessonItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { updateLesson, deleteLesson } = useLessonMutations();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!lesson) return null;

  const isCompleted = lesson.status === "completed";

  const handleDelete = async () => {
    await deleteLesson(lesson._id);
    setConfirmDelete(false);
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92dvh]">
        <div className="mx-auto w-full max-w-lg overflow-y-auto px-4 pb-8">
          <DrawerHeader className="px-0 text-left">
            <DrawerTitle className="text-left text-xl leading-tight">
              {lesson.title}
            </DrawerTitle>
            <DrawerDescription className="text-left">
              {lesson.subject} · {lesson.classGrade}
              {lesson.section ? ` · ${lesson.section}` : ""}
            </DrawerDescription>
          </DrawerHeader>

          <div className="flex flex-col gap-4">
            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="h-10 flex-1"
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="size-4" />
                Edit
              </Button>
              {!isCompleted && (
                <Button
                  variant="default"
                  className="h-10 flex-1"
                  onClick={() => updateLesson(lesson._id, { status: "completed" })}
                >
                  <Check className="size-4" />
                  Complete
                </Button>
              )}
              {isCompleted && (
                <Button
                  variant="outline"
                  className="h-10 flex-1"
                  onClick={() => updateLesson(lesson._id, { status: "planned" })}
                >
                  Reopen
                </Button>
              )}
              <Button
                variant="ghost"
                className="h-10 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setConfirmDelete(true)}
                aria-label="Delete lesson"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>

            {/* Status + priority quick change */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">Status</span>
                <Select
                  value={lesson.status}
                  onValueChange={(v) => updateLesson(lesson._id, { status: v })}
                >
                  <SelectTrigger aria-label="Change status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LESSON_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {LESSON_STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">Priority</span>
                <Select
                  value={lesson.priority}
                  onValueChange={(v) => updateLesson(lesson._id, { priority: v })}
                >
                  <SelectTrigger aria-label="Change priority" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LESSON_PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {LESSON_PRIORITY_LABELS[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-4" />
                {friendlyDate(lesson.lessonDate)}
              </span>
              {lesson.durationMinutes ? (
                <span className="inline-flex items-center gap-1.5">
                  <Timer className="size-4" />
                  {lesson.durationMinutes} min
                </span>
              ) : null}
            </div>

            <Separator />

            {/* All lesson info */}
            <div className="flex flex-col gap-4">
              <FieldBlock label="Topic" value={lesson.topic} />
              {lesson.objectives && <FieldBlock label="Learning objectives" value={lesson.objectives} />}
              {lesson.teachingActivities && (
                <FieldBlock label="Teaching activities" value={lesson.teachingActivities} />
              )}
              {lesson.materials && <FieldBlock label="Materials required" value={lesson.materials} />}
              {lesson.homework && <FieldBlock label="Homework" value={lesson.homework} />}
              {lesson.notes && <FieldBlock label="Notes" value={lesson.notes} />}
              {!isCompleted && !lesson.objectives && !lesson.teachingActivities && !lesson.materials && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <BookOpen className="size-4" />
                  Add objectives, activities and materials when you're ready.
                </p>
              )}
            </div>
          </div>
        </div>

        <EditLessonDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          lesson={lesson}
          onSaved={() => setEditOpen(false)}
        />

        <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this lesson?</AlertDialogTitle>
              <AlertDialogDescription>
                “{lesson.title}” will be permanently removed. This cannot be undone.
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
