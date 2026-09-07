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
import { Textarea } from "@/components/ui/textarea";
import { localDateStr } from "@/lib/attention";
import { isValidDateStr, isValidTime } from "@/lib/exam-seating-shared";
import {
  useSeatingMutations,
  type SeatingPlanItem,
} from "@/hooks/use-exam-seating";
import { useState } from "react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan?: SeatingPlanItem;
  onSaved?: () => void;
};

/** Create/edit seating plan dialog — mobile-first with clear validation. */
export function SeatingPlanFormDialog({ open, onOpenChange, plan, onSaved }: Props) {
  const { createPlan, updatePlan, pending } = useSeatingMutations();
  const [title, setTitle] = useState("");
  const [examName, setExamName] = useState("");
  const [examDate, setExamDate] = useState(localDateStr());
  const [startTime, setStartTime] = useState("");
  const [duration, setDuration] = useState("");
  const [room, setRoom] = useState("");
  const [rows, setRows] = useState("4");
  const [columns, setColumns] = useState("5");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Reset form fields whenever the dialog transitions to open — the guarded
  // render-time adjustment pattern recommended by React (no cascading effect).
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setTitle(plan?.title ?? "");
      setExamName(plan?.examName ?? "");
      setExamDate(plan?.examDate ?? localDateStr());
      setStartTime(plan?.startTime ?? "");
      setDuration(plan?.durationMinutes ? String(plan.durationMinutes) : "");
      setRoom(plan?.room ?? "");
      setRows(plan ? String(plan.rows) : "4");
      setColumns(plan ? String(plan.columns) : "5");
      setNotes(plan?.notes ?? "");
      setError(null);
    }
  }

  const rowsNum = Number.parseInt(rows, 10);
  const columnsNum = Number.parseInt(columns, 10);
  const durationNum = duration === "" ? undefined : Number.parseInt(duration, 10);
  const capacityPreview =
    Number.isInteger(rowsNum) && rowsNum > 0 && Number.isInteger(columnsNum) && columnsNum > 0
      ? rowsNum * columnsNum
      : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Required-field validation — clear, user-friendly, first error wins.
    if (!title.trim()) return setError("Please give this plan a title.");
    if (!examName.trim()) return setError("Please enter the exam name.");
    if (!examDate) return setError("Please pick the exam date.");
    if (!isValidDateStr(examDate))
      return setError("Exam date must be a valid date (YYYY-MM-DD).");
    if (startTime && !isValidTime(startTime))
      return setError("Start time must be a valid time (e.g. 09:00).");
    if (
      durationNum !== undefined &&
      (!Number.isInteger(durationNum) || durationNum <= 0)
    )
      return setError("Duration must be a positive whole number of minutes.");
    if (!Number.isInteger(rowsNum) || rowsNum <= 0 || rowsNum > 50)
      return setError("Rows must be a whole number between 1 and 50.");
    if (!Number.isInteger(columnsNum) || columnsNum <= 0 || columnsNum > 50)
      return setError("Columns must be a whole number between 1 and 50.");

    try {
      if (plan) {
        await updatePlan(plan._id, {
          title,
          examName,
          examDate,
          startTime: startTime || null,
          durationMinutes: durationNum ?? null,
          room: room || null,
          rows: rowsNum,
          columns: columnsNum,
          notes: notes || null,
        });
      } else {
        await createPlan({
          title,
          examName,
          examDate,
          startTime: startTime || undefined,
          durationMinutes: durationNum,
          room: room || undefined,
          rows: rowsNum,
          columns: columnsNum,
          notes: notes || undefined,
          status: "draft",
        });
      }
      onOpenChange(false);
      onSaved?.();
    } catch {
      // error toast already shown by the hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{plan ? "Edit seating plan" : "New seating plan"}</DialogTitle>
          <DialogDescription>
            {plan
              ? "Update the exam details or grid size for this plan."
              : "Plan where students sit for an upcoming exam."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="seating-title">Plan title</Label>
            <Input
              id="seating-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Mathematics Unit Test Seating"
              autoCapitalize="sentences"
              required
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="seating-exam">Exam name</Label>
            <Input
              id="seating-exam"
              value={examName}
              onChange={(e) => setExamName(e.target.value)}
              placeholder="e.g. Mathematics Unit Test"
              autoCapitalize="sentences"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="seating-date">Exam date</Label>
              <Input
                id="seating-date"
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="seating-time">Start time (optional)</Label>
              <Input
                id="seating-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="seating-duration">Duration (min, optional)</Label>
              <Input
                id="seating-duration"
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="e.g. 90"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="seating-room">Room (optional)</Label>
              <Input
                id="seating-room"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="e.g. Room 101"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="seating-rows">Rows</Label>
              <Input
                id="seating-rows"
                type="number"
                inputMode="numeric"
                min={1}
                max={50}
                step={1}
                value={rows}
                onChange={(e) => setRows(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="seating-columns">Columns</Label>
              <Input
                id="seating-columns"
                type="number"
                inputMode="numeric"
                min={1}
                max={50}
                step={1}
                value={columns}
                onChange={(e) => setColumns(e.target.value)}
                required
              />
            </div>
          </div>

          {capacityPreview !== null && (
            <p className="rounded-lg bg-primary/5 px-3 py-2 text-sm text-foreground">
              Grid capacity:{" "}
              <span className="font-semibold tabular-nums">
                {capacityPreview} {capacityPreview === 1 ? "seat" : "seats"}
              </span>
            </p>
          )}

          <div className="grid gap-1.5">
            <Label htmlFor="seating-notes">Notes</Label>
            <Textarea
              id="seating-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything to remember about this exam…"
              rows={2}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter className="mt-1 flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="ghost"
              className="w-full sm:w-auto"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" className="w-full sm:w-auto" disabled={pending}>
              {plan ? "Save changes" : "Create seating plan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CreateSeatingPlanDialog(props: Omit<Props, "plan">) {
  return <SeatingPlanFormDialog {...props} />;
}

export function EditSeatingPlanDialog(props: Omit<Props, "defaults">) {
  return <SeatingPlanFormDialog {...props} />;
}