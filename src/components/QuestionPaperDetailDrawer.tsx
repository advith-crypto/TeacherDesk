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
import { EditQuestionPaperDialog } from "./QuestionPaperFormDialog";
import { friendlyDate } from "@/lib/attention";
import {
  QUESTION_PAPER_PRIORITIES,
  QUESTION_PAPER_PRIORITY_LABELS,
  QUESTION_PAPER_STATUSES,
  QUESTION_PAPER_STATUS_LABELS,
  type QuestionPaperPriority,
  type QuestionPaperStatus,
} from "@/lib/question-papers-shared";
import {
  useQuestionPaperMutations,
  type QuestionPaperItem,
} from "@/hooks/use-question-papers";
import { CalendarDays, Check, Clock, FileText, Pencil, Trash2 } from "lucide-react";
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

/** Question paper detail bottom sheet — view all fields, quick status, delete. */
export function QuestionPaperDetailDrawer({
  paper,
  open,
  onOpenChange,
}: {
  paper: QuestionPaperItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { updateQuestionPaper, deleteQuestionPaper } = useQuestionPaperMutations();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!paper) return null;

  const isCompleted = paper.status === "completed";

  const handleDelete = async () => {
    await deleteQuestionPaper(paper._id);
    setConfirmDelete(false);
    onOpenChange(false);
  };

  const marksLine =
    paper.totalMarks !== undefined && paper.totalMarks > 0
      ? `${paper.totalMarks} marks`
      : null;
  const questionsLine =
    paper.questionCount !== undefined && paper.questionCount > 0
      ? `${paper.questionCount} questions`
      : null;
  const durationLine =
    paper.durationMinutes !== undefined && paper.durationMinutes > 0
      ? `${paper.durationMinutes} min`
      : null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92dvh]">
        <div className="mx-auto w-full max-w-lg overflow-y-auto px-4 pb-8">
          <DrawerHeader className="px-0 text-left">
            <DrawerTitle className="text-left text-xl leading-tight">
              {paper.title}
            </DrawerTitle>
            <DrawerDescription className="text-left">
              {paper.subject} · {paper.classGrade}
              {paper.section ? ` · ${paper.section}` : ""} · {paper.examType}
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
              {!isCompleted && paper.status !== "ready" && (
                <Button
                  variant="outline"
                  className="h-10 flex-1"
                  onClick={() => updateQuestionPaper(paper._id, { status: "ready" })}
                >
                  Mark ready
                </Button>
              )}
              {!isCompleted && (
                <Button
                  variant="default"
                  className="h-10 flex-1"
                  onClick={() => updateQuestionPaper(paper._id, { status: "completed" })}
                >
                  <Check className="size-4" />
                  Complete
                </Button>
              )}
              {isCompleted && (
                <Button
                  variant="outline"
                  className="h-10 flex-1"
                  onClick={() => updateQuestionPaper(paper._id, { status: "draft" })}
                >
                  Reopen
                </Button>
              )}
              <Button
                variant="ghost"
                className="h-10 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setConfirmDelete(true)}
                aria-label="Delete question paper"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>

            {/* Status + priority quick change */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">Status</span>
                <Select
                  value={paper.status}
                  onValueChange={(v) => updateQuestionPaper(paper._id, { status: v })}
                >
                  <SelectTrigger aria-label="Change status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {QUESTION_PAPER_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {QUESTION_PAPER_STATUS_LABELS[s as QuestionPaperStatus]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">Priority</span>
                <Select
                  value={paper.priority}
                  onValueChange={(v) => updateQuestionPaper(paper._id, { priority: v })}
                >
                  <SelectTrigger aria-label="Change priority" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {QUESTION_PAPER_PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {QUESTION_PAPER_PRIORITY_LABELS[p as QuestionPaperPriority]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-4" />
                Exam: {paper.examDate ? friendlyDate(paper.examDate) : "Not set"}
              </span>
              {paper.preparationDeadline && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="size-4" />
                  Prep by {friendlyDate(paper.preparationDeadline)}
                </span>
              )}
            </div>

            <Separator />

            {/* All paper info */}
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-3">
                <FieldBlock
                  label="Total marks"
                  value={marksLine ?? "—"}
                />
                <FieldBlock
                  label="Questions"
                  value={questionsLine ?? "—"}
                />
                <FieldBlock
                  label="Duration"
                  value={durationLine ?? "—"}
                />
              </div>
              {paper.syllabusTopics && (
                <FieldBlock label="Syllabus / topics" value={paper.syllabusTopics} />
              )}
              {paper.notes && <FieldBlock label="Notes" value={paper.notes} />}
              {!isCompleted && !paper.syllabusTopics && !paper.notes && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="size-4" />
                  Add syllabus topics or notes when you start drafting.
                </p>
              )}
            </div>
          </div>
        </div>

        <EditQuestionPaperDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          paper={paper}
          onSaved={() => setEditOpen(false)}
        />

        <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this question paper?</AlertDialogTitle>
              <AlertDialogDescription>
                “{paper.title}” will be permanently removed. This cannot be undone.
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