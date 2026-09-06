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
  EXAM_TYPES,
  QUESTION_PAPER_PRIORITIES,
  QUESTION_PAPER_PRIORITY_LABELS,
  QUESTION_PAPER_STATUSES,
  QUESTION_PAPER_STATUS_LABELS,
  type QuestionPaperPriority,
  type QuestionPaperStatus,
} from "@/lib/question-papers-shared";
import { useQuestionPaperMutations } from "@/hooks/use-question-papers";
import type { QuestionPaperItem } from "@/hooks/use-question-papers";
import { useState } from "react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paper?: QuestionPaperItem;
  onSaved?: (id?: string) => void;
};

/** Create/edit question paper dialog — mobile-first with clear validation. */
export function QuestionPaperFormDialog({ open, onOpenChange, paper, onSaved }: Props) {
  const { createQuestionPaper, updateQuestionPaper, pending } =
    useQuestionPaperMutations();
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [classGrade, setClassGrade] = useState("");
  const [section, setSection] = useState("");
  const [examType, setExamType] = useState<string>(EXAM_TYPES[0]);
  const [examDate, setExamDate] = useState("");
  const [prepDeadline, setPrepDeadline] = useState("");
  const [duration, setDuration] = useState("");
  const [totalMarks, setTotalMarks] = useState("");
  const [questionCount, setQuestionCount] = useState("");
  const [syllabusTopics, setSyllabusTopics] = useState("");
  const [status, setStatus] = useState("not_started");
  const [priority, setPriority] = useState("medium");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Reset form fields whenever the dialog transitions to open — the guarded
  // render-time adjustment pattern recommended by React (no cascading effect).
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setTitle(paper?.title ?? "");
      setSubject(paper?.subject ?? "");
      setClassGrade(paper?.classGrade ?? "");
      setSection(paper?.section ?? "");
      setExamType(paper?.examType ?? EXAM_TYPES[0]);
      setExamDate(paper?.examDate ?? "");
      setPrepDeadline(paper?.preparationDeadline ?? "");
      setDuration(paper?.durationMinutes ? String(paper.durationMinutes) : "");
      setTotalMarks(paper?.totalMarks ? String(paper.totalMarks) : "");
      setQuestionCount(paper?.questionCount ? String(paper.questionCount) : "");
      setSyllabusTopics(paper?.syllabusTopics ?? "");
      setStatus(paper?.status ?? "not_started");
      setPriority(paper?.priority ?? "medium");
      setNotes(paper?.notes ?? "");
      setError(null);
    }
  }

  /** Parses an optional positive whole number; ok:false means invalid input. */
  const optionalInt = (
    value: string,
  ): { ok: true; value?: number } | { ok: false } => {
    if (!value.trim()) return { ok: true };
    const n = Number(value);
    if (!Number.isInteger(n) || n <= 0) return { ok: false };
    return { ok: true, value: n };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Required-field validation — clear, user-friendly, first error wins.
    if (!title.trim()) return setError("Please give the paper a title.");
    if (!subject.trim()) return setError("Please enter the subject.");
    if (!classGrade.trim()) return setError("Please enter the class / grade.");

    if (examDate && prepDeadline && prepDeadline > examDate)
      return setError("Preparation deadline should be before the exam date.");

    const durationParsed = optionalInt(duration);
    if (!durationParsed.ok)
      return setError("Duration must be a positive whole number of minutes.");
    const marksParsed = optionalInt(totalMarks);
    if (!marksParsed.ok)
      return setError("Total marks must be a positive whole number.");
    const countParsed = optionalInt(questionCount);
    if (!countParsed.ok)
      return setError("Question count must be a positive whole number.");

    const durationMinutes = durationParsed.value;
    const totalMarksValue = marksParsed.value;
    const questionCountValue = countParsed.value;

    try {
      if (paper) {
        await updateQuestionPaper(paper._id, {
          title,
          subject,
          classGrade,
          section: section || null,
          examType,
          examDate: examDate || null,
          preparationDeadline: prepDeadline || null,
          durationMinutes: durationMinutes ?? null,
          totalMarks: totalMarksValue ?? null,
          questionCount: questionCountValue ?? null,
          syllabusTopics: syllabusTopics || null,
          status,
          priority,
          notes: notes || null,
        });
      } else {
        await createQuestionPaper({
          title,
          subject,
          classGrade,
          section: section || undefined,
          examType,
          examDate: examDate || undefined,
          preparationDeadline: prepDeadline || undefined,
          durationMinutes,
          totalMarks: totalMarksValue,
          questionCount: questionCountValue,
          syllabusTopics: syllabusTopics || undefined,
          status,
          priority,
          notes: notes || undefined,
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
          <DialogTitle>{paper ? "Edit question paper" : "Create question paper"}</DialogTitle>
          <DialogDescription>
            {paper
              ? "Update the details of this question paper."
              : "Plan a paper from draft to ready for the exam."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="qp-title">Paper title</Label>
            <Input
              id="qp-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Mathematics Unit Test"
              autoCapitalize="sentences"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="qp-subject">Subject</Label>
              <Input
                id="qp-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Mathematics"
                autoCapitalize="words"
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="qp-class">Class / Grade</Label>
              <Input
                id="qp-class"
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
              <Label htmlFor="qp-section">Section (optional)</Label>
              <Input
                id="qp-section"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                placeholder="e.g. A"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Exam type</Label>
              <Select value={examType} onValueChange={setExamType}>
                <SelectTrigger className="w-full" aria-label="Exam type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXAM_TYPES.map((t) => (
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
              <Label htmlFor="qp-exam-date">Exam date (optional)</Label>
              <Input
                id="qp-exam-date"
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="qp-prep-deadline">Preparation deadline (optional)</Label>
              <Input
                id="qp-prep-deadline"
                type="date"
                value={prepDeadline}
                onChange={(e) => setPrepDeadline(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="qp-duration">Duration (min)</Label>
              <Input
                id="qp-duration"
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
              <Label htmlFor="qp-marks">Total marks</Label>
              <Input
                id="qp-marks"
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                value={totalMarks}
                onChange={(e) => setTotalMarks(e.target.value)}
                placeholder="e.g. 40"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="qp-count">Questions</Label>
              <Input
                id="qp-count"
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                value={questionCount}
                onChange={(e) => setQuestionCount(e.target.value)}
                placeholder="e.g. 20"
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="qp-syllabus">Syllabus / topics</Label>
            <Textarea
              id="qp-syllabus"
              value={syllabusTopics}
              onChange={(e) => setSyllabusTopics(e.target.value)}
              placeholder="Chapters or topics the paper should cover…"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-full" aria-label="Status">
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
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="w-full" aria-label="Priority">
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

          <div className="grid gap-1.5">
            <Label htmlFor="qp-notes">Notes</Label>
            <Textarea
              id="qp-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Section-wise marks, instructions, reminders…"
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
              {paper ? "Save changes" : "Create question paper"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CreateQuestionPaperDialog(props: Omit<Props, "paper">) {
  return <QuestionPaperFormDialog {...props} />;
}

export function EditQuestionPaperDialog(props: Omit<Props, "defaults">) {
  return <QuestionPaperFormDialog {...props} />;
}