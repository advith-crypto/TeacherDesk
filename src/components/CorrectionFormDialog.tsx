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
import {
  ASSESSMENT_TYPES,
  CORRECTION_PRIORITIES,
  CORRECTION_PRIORITY_LABELS,
  CORRECTION_STATUS_LABELS,
  deriveCorrectionStatus,
  type CorrectionPriority,
  type CorrectionStatus,
} from "@/lib/corrections-shared";
import { localDateStr } from "@/lib/attention";
import { useCorrectionMutations } from "@/hooks/use-corrections";
import type { CorrectionItem } from "@/hooks/use-corrections";
import { useState } from "react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  correction?: CorrectionItem;
  onSaved?: (id?: string) => void;
};

/** Create/edit correction dialog — mobile-first with clear validation. */
export function CorrectionFormDialog({ open, onOpenChange, correction, onSaved }: Props) {
  const { createCorrection, updateCorrection, pending } = useCorrectionMutations();
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [classGrade, setClassGrade] = useState("");
  const [section, setSection] = useState("");
  const [assessmentType, setAssessmentType] = useState<string>(ASSESSMENT_TYPES[0]);
  const [assessmentDate, setAssessmentDate] = useState("");
  const [deadline, setDeadline] = useState(localDateStr());
  const [totalPapers, setTotalPapers] = useState("40");
  const [correctedPapers, setCorrectedPapers] = useState("0");
  const [priority, setPriority] = useState("medium");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Reset form fields whenever the dialog transitions to open — the guarded
  // render-time adjustment pattern recommended by React (no cascading effect).
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setTitle(correction?.title ?? "");
      setSubject(correction?.subject ?? "");
      setClassGrade(correction?.classGrade ?? "");
      setSection(correction?.section ?? "");
      setAssessmentType(correction?.assessmentType ?? ASSESSMENT_TYPES[0]);
      setAssessmentDate(correction?.assessmentDate ?? "");
      setDeadline(correction?.correctionDeadline ?? localDateStr());
      setTotalPapers(correction ? String(correction.totalPapers) : "40");
      setCorrectedPapers(correction ? String(correction.correctedPapers) : "0");
      setPriority(correction?.priority ?? "medium");
      setNotes(correction?.notes ?? "");
      setError(null);
    }
  }

  const total = Number.parseInt(totalPapers, 10);
  const corrected = Number.parseInt(correctedPapers, 10);
  const statusPreview = Number.isFinite(total) && total > 0 && Number.isFinite(corrected)
    ? deriveCorrectionStatus(corrected, total)
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Required-field validation — clear, user-friendly, first error wins.
    if (!title.trim()) return setError("Please give this batch a title.");
    if (!subject.trim()) return setError("Please enter the subject.");
    if (!classGrade.trim()) return setError("Please enter the class / grade.");
    if (!deadline) return setError("Please pick the correction deadline.");

    if (!Number.isInteger(total) || total <= 0)
      return setError("Total papers must be a positive whole number.");
    if (!Number.isInteger(corrected) || corrected < 0)
      return setError("Corrected papers cannot be negative.");
    if (corrected > total)
      return setError("Corrected papers cannot exceed total papers.");

    try {
      if (correction) {
        await updateCorrection(correction._id, {
          title,
          subject,
          classGrade,
          section: section || null,
          assessmentType,
          assessmentDate: assessmentDate || null,
          correctionDeadline: deadline,
          totalPapers: total,
          correctedPapers: corrected,
          notes: notes || null,
          priority,
        });
      } else {
        await createCorrection({
          title,
          subject,
          classGrade,
          section: section || undefined,
          assessmentType,
          assessmentDate: assessmentDate || undefined,
          correctionDeadline: deadline,
          totalPapers: total,
          correctedPapers: corrected,
          notes: notes || undefined,
          priority,
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
          <DialogTitle>{correction ? "Edit correction" : "Add correction"}</DialogTitle>
          <DialogDescription>
            {correction
              ? "Update the details of this correction batch."
              : "Track a batch of papers that need correction."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="correction-title">Correction title</Label>
            <Input
              id="correction-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Grade 9 Maths Unit Test"
              autoCapitalize="sentences"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="correction-subject">Subject</Label>
              <Input
                id="correction-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Mathematics"
                autoCapitalize="words"
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="correction-class">Class / Grade</Label>
              <Input
                id="correction-class"
                value={classGrade}
                onChange={(e) => setClassGrade(e.target.value)}
                placeholder="e.g. Grade 9"
                autoCapitalize="words"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="correction-section">Section (optional)</Label>
              <Input
                id="correction-section"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                placeholder="e.g. B"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Assessment type</Label>
              <Select value={assessmentType} onValueChange={setAssessmentType}>
                <SelectTrigger className="w-full" aria-label="Assessment type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSESSMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="correction-assessment-date">Assessment date (optional)</Label>
              <Input
                id="correction-assessment-date"
                type="date"
                value={assessmentDate}
                onChange={(e) => setAssessmentDate(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="correction-deadline">Correction deadline</Label>
              <Input
                id="correction-deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="correction-total">Total papers</Label>
              <Input
                id="correction-total"
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                value={totalPapers}
                onChange={(e) => setTotalPapers(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="correction-corrected">Corrected papers</Label>
              <Input
                id="correction-corrected"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={correctedPapers}
                onChange={(e) => setCorrectedPapers(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="w-full" aria-label="Priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CORRECTION_PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {CORRECTION_PRIORITY_LABELS[p as CorrectionPriority]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="correction-notes">Notes</Label>
            <Textarea
              id="correction-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything to remember about this batch…"
              rows={2}
            />
          </div>

          {statusPreview && (
            <p className="text-xs text-muted-foreground">
              Status will be:{" "}
              <span className="font-medium text-foreground">
                {CORRECTION_STATUS_LABELS[statusPreview as CorrectionStatus]}
              </span>
            </p>
          )}

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
              {correction ? "Save changes" : "Add correction"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CreateCorrectionDialog(props: Omit<Props, "correction">) {
  return <CorrectionFormDialog {...props} />;
}

export function EditCorrectionDialog(props: Omit<Props, "defaults">) {
  return <CorrectionFormDialog {...props} />;
}