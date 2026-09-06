import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Separator } from "@/components/ui/separator";
import { EditCorrectionDialog } from "./CorrectionFormDialog";
import { friendlyDate } from "@/lib/attention";
import {
  CORRECTION_PRIORITY_LABELS,
  CORRECTION_STATUS_LABELS,
  progressPercent,
  remainingPapers,
  type CorrectionPriority,
  type CorrectionStatus,
} from "@/lib/corrections-shared";
import { cn } from "@/lib/utils";
import { useCorrectionMutations, type CorrectionItem } from "@/hooks/use-corrections";
import { Check, Minus, Pencil, Plus, Trash2 } from "lucide-react";
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

/** Correction detail bottom sheet — view all fields, update progress, delete. */
export function CorrectionDetailDrawer({
  correction,
  open,
  onOpenChange,
}: {
  correction: CorrectionItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { updateCorrectionProgress, deleteCorrection } = useCorrectionMutations();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [countInput, setCountInput] = useState("");

  // Sync the editable count when the drawer opens (guarded render-time pattern).
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open && correction) setCountInput(String(correction.correctedPapers));
  }

  if (!correction) return null;

  const isCompleted = correction.status === "completed";
  const remaining = remainingPapers(correction.totalPapers, correction.correctedPapers);
  const pct = progressPercent(correction.totalPapers, correction.correctedPapers);

  const bump = async (delta: number) => {
    if (busy) return;
    const next = correction.correctedPapers + delta;
    if (next < 0 || next > correction.totalPapers) return;
    setBusy(true);
    try {
      await updateCorrectionProgress(correction._id, next);
      setCountInput(String(next));
    } finally {
      setBusy(false);
    }
  };

  const commitCount = async () => {
    const value = Number.parseInt(countInput, 10);
    if (!Number.isInteger(value)) {
      setCountInput(String(correction.correctedPapers));
      return;
    }
    const next = Math.min(correction.totalPapers, Math.max(0, value));
    setCountInput(String(next));
    if (next === correction.correctedPapers) return;
    setBusy(true);
    try {
      await updateCorrectionProgress(correction._id, next);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    await deleteCorrection(correction._id);
    setConfirmDelete(false);
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92dvh]">
        <div className="mx-auto w-full max-w-lg overflow-y-auto px-4 pb-8">
          <DrawerHeader className="px-0 text-left">
            <DrawerTitle className="text-left text-xl leading-tight">
              {correction.title}
            </DrawerTitle>
            <DrawerDescription className="text-left">
              {correction.subject} · {correction.classGrade}
              {correction.section ? ` · ${correction.section}` : ""} ·{" "}
              {correction.assessmentType}
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
                  disabled={busy}
                  onClick={() => bump(correction.totalPapers - correction.correctedPapers)}
                >
                  <Check className="size-4" />
                  Mark completed
                </Button>
              )}
              {isCompleted && (
                <Button
                  variant="outline"
                  className="h-10 flex-1"
                  disabled={busy}
                  onClick={() =>
                    updateCorrectionProgress(
                      correction._id,
                      Math.max(0, correction.totalPapers - 1),
                    )
                  }
                >
                  Reopen
                </Button>
              )}
              <Button
                variant="ghost"
                className="h-10 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setConfirmDelete(true)}
                aria-label="Delete correction"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>

            {/* Progress */}
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold tabular-nums">
                  {correction.correctedPapers} / {correction.totalPapers} corrected
                </span>
                <span className="text-sm font-medium tabular-nums text-muted-foreground">
                  {pct}%
                </span>
              </div>
              <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-primary/10">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    isCompleted ? "bg-emerald-500" : "bg-primary",
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-[13px] text-muted-foreground">
                {isCompleted
                  ? "All papers corrected"
                  : `${remaining} ${remaining === 1 ? "paper" : "papers"} remaining`}
              </p>

              <div className="mt-1 flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Decrease corrected papers"
                  disabled={busy || correction.correctedPapers <= 0}
                  onClick={() => bump(-1)}
                  className="flex size-11 items-center justify-center rounded-xl border border-border bg-card text-foreground transition-colors active:scale-95 disabled:opacity-35"
                >
                  <Minus className="size-5" />
                </button>
                <div className="flex flex-1 items-center gap-2">
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={correction.totalPapers}
                    value={countInput}
                    onChange={(e) => setCountInput(e.target.value)}
                    onBlur={commitCount}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        commitCount();
                      }
                    }}
                    aria-label="Corrected papers count"
                    className="h-11 text-center text-base tabular-nums"
                  />
                  <span className="shrink-0 text-sm text-muted-foreground">
                    of {correction.totalPapers}
                  </span>
                </div>
                <button
                  type="button"
                  aria-label="Increase corrected papers"
                  disabled={busy || correction.correctedPapers >= correction.totalPapers}
                  onClick={() => bump(1)}
                  className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-colors active:scale-95 disabled:opacity-35"
                >
                  <Plus className="size-5" />
                </button>
              </div>
            </div>

            {/* Status + priority chips */}
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
                  isCompleted
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                    : "bg-secondary text-foreground",
                )}
              >
                {CORRECTION_STATUS_LABELS[correction.status as CorrectionStatus] ?? correction.status}
              </span>
              <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-foreground">
                {CORRECTION_PRIORITY_LABELS[correction.priority as CorrectionPriority] ?? "Medium"}
              </span>
              <span className="text-sm text-muted-foreground">
                Deadline: {friendlyDate(correction.correctionDeadline)}
              </span>
            </div>

            <Separator />

            {/* All correction info */}
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <FieldBlock
                  label="Assessment type"
                  value={correction.assessmentType}
                />
                <FieldBlock
                  label="Assessment date"
                  value={
                    correction.assessmentDate
                      ? friendlyDate(correction.assessmentDate)
                      : "—"
                  }
                />
                <FieldBlock label="Total papers" value={String(correction.totalPapers)} />
                <FieldBlock
                  label="Corrected papers"
                  value={String(correction.correctedPapers)}
                />
                <FieldBlock label="Remaining papers" value={String(remaining)} />
                <FieldBlock label="Progress" value={`${pct}%`} />
              </div>
              {correction.notes && (
                <FieldBlock label="Notes" value={correction.notes} />
              )}
            </div>
          </div>
        </div>

        <EditCorrectionDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          correction={correction}
          onSaved={() => setEditOpen(false)}
        />

        <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this correction?</AlertDialogTitle>
              <AlertDialogDescription>
                “{correction.title}” and its progress will be permanently removed.
                This cannot be undone.
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