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
  LESSON_PRIORITIES,
  LESSON_PRIORITY_LABELS,
  LESSON_STATUSES,
  LESSON_STATUS_LABELS,
} from "@/lib/lessons-shared";
import { localDateStr } from "@/lib/attention";
import { useLessonMutations } from "@/hooks/use-lessons";
import type { LessonItem } from "@/hooks/use-lessons";
import { useEffect, useState } from "react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lesson?: LessonItem;
  onSaved?: (id?: string) => void;
};

/** Create/edit lesson dialog — mobile-first with clear required-field validation. */
export function LessonFormDialog({ open, onOpenChange, lesson, onSaved }: Props) {
  const { createLesson, updateLesson, pending } = useLessonMutations();
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [classGrade, setClassGrade] = useState("");
  const [section, setSection] = useState("");
  const [topic, setTopic] = useState("");
  const [lessonDate, setLessonDate] = useState(localDateStr());
  const [duration, setDuration] = useState("");
  const [objectives, setObjectives] = useState("");
  const [activities, setActivities] = useState("");
  const [materials, setMaterials] = useState("");
  const [homework, setHomework] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("planned");
  const [priority, setPriority] = useState("medium");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTitle(lesson?.title ?? "");
      setSubject(lesson?.subject ?? "");
      setClassGrade(lesson?.classGrade ?? "");
      setSection(lesson?.section ?? "");
      setTopic(lesson?.topic ?? "");
      setLessonDate(lesson?.lessonDate ?? localDateStr());
      setDuration(lesson?.durationMinutes ? String(lesson.durationMinutes) : "");
      setObjectives(lesson?.objectives ?? "");
      setActivities(lesson?.teachingActivities ?? "");
      setMaterials(lesson?.materials ?? "");
      setHomework(lesson?.homework ?? "");
      setNotes(lesson?.notes ?? "");
      setStatus(lesson?.status ?? "planned");
      setPriority(lesson?.priority ?? "medium");
      setError(null);
    }
  }, [open, lesson]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Required-field validation — clear, user-friendly, first error wins.
    if (!title.trim()) return setError("Please give the lesson a title.");
    if (!subject.trim()) return setError("Please enter the subject.");
    if (!classGrade.trim()) return setError("Please enter the class / grade.");
    if (!topic.trim()) return setError("Please enter the topic.");
    if (!lessonDate) return setError("Please pick the lesson date.");

    const durationMinutes = duration.trim()
      ? Number.parseInt(duration.trim(), 10)
      : undefined;
    if (durationMinutes !== undefined && (!Number.isFinite(durationMinutes) || durationMinutes <= 0)) {
      return setError("Duration must be a positive number of minutes.");
    }

    try {
      if (lesson) {
        await updateLesson(lesson._id, {
          title,
          subject,
          classGrade,
          section: section || null,
          topic,
          lessonDate,
          durationMinutes: durationMinutes ?? null,
          objectives: objectives || null,
          teachingActivities: activities || null,
          materials: materials || null,
          homework: homework || null,
          notes: notes || null,
          status,
          priority,
        });
      } else {
        await createLesson({
          title,
          subject,
          classGrade,
          section: section || undefined,
          topic,
          lessonDate,
          durationMinutes,
          objectives: objectives || undefined,
          teachingActivities: activities || undefined,
          materials: materials || undefined,
          homework: homework || undefined,
          notes: notes || undefined,
          status,
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
          <DialogTitle>{lesson ? "Edit lesson" : "Plan lesson"}</DialogTitle>
          <DialogDescription>
            {lesson
              ? "Update the details of this lesson."
              : "Plan what to teach, when, and what to prepare."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="lesson-title">Lesson title</Label>
            <Input
              id="lesson-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Quadratic equations — intro"
              autoCapitalize="sentences"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="lesson-subject">Subject</Label>
              <Input
                id="lesson-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Mathematics"
                autoCapitalize="words"
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="lesson-class">Class / Grade</Label>
              <Input
                id="lesson-class"
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
              <Label htmlFor="lesson-section">Section (optional)</Label>
              <Input
                id="lesson-section"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                placeholder="e.g. B"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="lesson-date">Lesson date</Label>
              <Input
                id="lesson-date"
                type="date"
                value={lessonDate}
                onChange={(e) => setLessonDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="lesson-topic">Topic</Label>
            <Input
              id="lesson-topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Solving by factorisation"
              required
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="lesson-duration">Duration (minutes, optional)</Label>
            <Input
              id="lesson-duration"
              type="number"
              inputMode="numeric"
              min={1}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="e.g. 45"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="lesson-objectives">Learning objectives</Label>
            <Textarea
              id="lesson-objectives"
              value={objectives}
              onChange={(e) => setObjectives(e.target.value)}
              placeholder="What should students be able to do after this lesson?"
              rows={3}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="lesson-activities">Teaching activities</Label>
            <Textarea
              id="lesson-activities"
              value={activities}
              onChange={(e) => setActivities(e.target.value)}
              placeholder="Warm-up, explanation, group work…"
              rows={3}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="lesson-materials">Materials required</Label>
            <Textarea
              id="lesson-materials"
              value={materials}
              onChange={(e) => setMaterials(e.target.value)}
              placeholder="Textbook pages, worksheets, projector…"
              rows={2}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="lesson-homework">Homework</Label>
            <Textarea
              id="lesson-homework"
              value={homework}
              onChange={(e) => setHomework(e.target.value)}
              placeholder="Exercises to assign…"
              rows={2}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="lesson-notes">Notes</Label>
            <Textarea
              id="lesson-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything to remember for next time…"
              rows={2}
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
                  {LESSON_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {LESSON_STATUS_LABELS[s]}
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
                  {LESSON_PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {LESSON_PRIORITY_LABELS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
              {lesson ? "Save changes" : "Plan lesson"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CreateLessonDialog(props: Omit<Props, "lesson">) {
  return <LessonFormDialog {...props} />;
}

export function EditLessonDialog(props: Omit<Props, "defaults">) {
  return <LessonFormDialog {...props} />;
}
