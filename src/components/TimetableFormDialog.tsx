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
  DAYS_OF_WEEK,
  findConflicts,
  isValidTime,
  timeToMinutes,
  type TimetableEntryLike,
} from "@/lib/timetable-shared";
import {
  useTimetableEntries,
  useTimetableMutations,
  type TimetableEntryItem,
} from "@/hooks/use-timetable";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: TimetableEntryItem;
  defaultDay?: number;
  onSaved?: () => void;
};

/** Create/edit timetable period dialog — mobile-first with conflict warnings. */
export function TimetableFormDialog({
  open,
  onOpenChange,
  entry,
  defaultDay,
  onSaved,
}: Props) {
  const { createEntry, updateEntry, pending } = useTimetableMutations();
  const allEntries = useTimetableEntries();

  const [day, setDay] = useState(0);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [subject, setSubject] = useState("");
  const [classGrade, setClassGrade] = useState("");
  const [section, setSection] = useState("");
  const [room, setRoom] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Reset form fields whenever the dialog transitions to open — the guarded
  // render-time adjustment pattern recommended by React (no cascading effect).
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setDay(entry?.dayOfWeek ?? defaultDay ?? new Date().getDay());
      setStartTime(entry?.startTime ?? "");
      setEndTime(entry?.endTime ?? "");
      setSubject(entry?.subject ?? "");
      setClassGrade(entry?.classGrade ?? "");
      setSection(entry?.section ?? "");
      setRoom(entry?.room ?? "");
      setNotes(entry?.notes ?? "");
      setError(null);
    }
  }

  const dayEntries: TimetableEntryLike[] = (allEntries ?? [])
    .filter((e) => e.dayOfWeek === day)
    .map((e) => ({ ...e, _id: e._id }));

  const conflicts =
    dayEntries.length > 0 && isValidTime(startTime) && isValidTime(endTime)
      ? findConflicts(dayEntries, { dayOfWeek: day, startTime, endTime }, entry?._id)
      : [];
  const hasConflict = conflicts.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) return setError("Please enter the subject.");
    if (!classGrade.trim()) return setError("Please enter the class / grade.");
    if (!isValidTime(startTime))
      return setError("Please choose a valid start time.");
    if (!isValidTime(endTime)) return setError("Please choose a valid end time.");
    if (timeToMinutes(endTime) <= timeToMinutes(startTime))
      return setError("End time must be after the start time.");
    if (hasConflict)
      return setError(
        `This overlaps with "${conflicts[0].subject}" (${conflicts[0].startTime}–${conflicts[0].endTime}) on ${DAYS_OF_WEEK[day]}.`,
      );

    try {
      if (entry) {
        await updateEntry(entry._id, {
          dayOfWeek: day,
          startTime,
          endTime,
          subject,
          classGrade,
          section: section || null,
          room: room || null,
          notes: notes || null,
        });
      } else {
        await createEntry({
          dayOfWeek: day,
          startTime,
          endTime,
          subject,
          classGrade,
          section: section || undefined,
          room: room || undefined,
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
          <DialogTitle>{entry ? "Edit period" : "Add period"}</DialogTitle>
          <DialogDescription>
            {entry
              ? "Update this teaching period in your weekly schedule."
              : "Add a teaching period to your weekly schedule."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-1.5">
            <Label>Day</Label>
            <Select value={String(day)} onValueChange={(v) => setDay(Number(v))}>
              <SelectTrigger className="w-full" aria-label="Day of the week">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAYS_OF_WEEK.map((d, i) => (
                  <SelectItem key={d} value={String(i)}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="tt-start">Start time</Label>
              <Input
                id="tt-start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="tt-end">End time</Label>
              <Input
                id="tt-end"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="tt-subject">Subject</Label>
              <Input
                id="tt-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Mathematics"
                autoCapitalize="words"
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="tt-class">Class / Grade</Label>
              <Input
                id="tt-class"
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
              <Label htmlFor="tt-section">Section (optional)</Label>
              <Input
                id="tt-section"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                placeholder="e.g. A"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="tt-room">Room (optional)</Label>
              <Input
                id="tt-room"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="e.g. Room 101"
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="tt-notes">Notes (optional)</Label>
            <Textarea
              id="tt-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Bring lab equipment"
              rows={2}
            />
          </div>

          {hasConflict && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>
                This overlaps with “{conflicts[0].subject}” (
                {conflicts[0].startTime}–{conflicts[0].endTime}) on{" "}
                {DAYS_OF_WEEK[day]}. Choose a different time.
              </span>
            </p>
          )}

          {error && !hasConflict && <p className="text-sm text-destructive">{error}</p>}

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
            <Button
              type="submit"
              className="w-full sm:w-auto"
              disabled={pending || hasConflict}
            >
              {entry ? "Save changes" : "Add period"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CreateTimetablePeriodDialog(
  props: Omit<Props, "entry"> & { defaultDay?: number },
) {
  return <TimetableFormDialog {...props} />;
}

export function EditTimetablePeriodDialog(props: Omit<Props, "defaultDay">) {
  return <TimetableFormDialog {...props} />;
}