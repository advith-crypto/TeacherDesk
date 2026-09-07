import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Separator } from "@/components/ui/separator";
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
import { EditTimetablePeriodDialog } from "./TimetableFormDialog";
import {
  DAYS_OF_WEEK,
  formatTime12,
} from "@/lib/timetable-shared";
import {
  useTimetableMutations,
  type TimetableEntryItem,
} from "@/hooks/use-timetable";
import { BookOpen, DoorOpen, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

function FieldBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <p className="whitespace-pre-wrap break-words text-sm">{value}</p>
    </div>
  );
}

/** Timetable period detail bottom sheet — full info, edit, delete. */
export function TimetableDetailDrawer({
  entry,
  open,
  onOpenChange,
}: {
  entry: TimetableEntryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { deleteEntry } = useTimetableMutations();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!entry) return null;

  const handleDelete = async () => {
    await deleteEntry(entry._id);
    setConfirmDelete(false);
    onOpenChange(false);
  };

  const dayLabel = DAYS_OF_WEEK[entry.dayOfWeek] ?? "Unknown day";

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92dvh]">
        <div className="mx-auto w-full max-w-lg overflow-y-auto px-4 pb-8">
          <DrawerHeader className="px-0 text-left">
            <DrawerTitle className="text-left text-xl leading-tight">
              {entry.subject}
            </DrawerTitle>
            <DrawerDescription className="text-left">
              {dayLabel} · {formatTime12(entry.startTime)} –{" "}
              {formatTime12(entry.endTime)}
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
              <Button
                variant="ghost"
                className="h-10 flex-1 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="size-4" />
                Delete
              </Button>
            </div>

            <Separator />

            {/* All period info */}
            <div className="flex flex-col gap-4">
              <FieldBlock label="Subject" value={entry.subject} />
              <div className="grid grid-cols-2 gap-3">
                <FieldBlock label="Class / Grade" value={entry.classGrade} />
                <FieldBlock label="Section" value={entry.section || "—"} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FieldBlock label="Day" value={dayLabel} />
                <FieldBlock
                  label="Time"
                  value={`${formatTime12(entry.startTime)} – ${formatTime12(entry.endTime)}`}
                />
              </div>
              <FieldBlock label="Room" value={entry.room || "—"} />
              {entry.notes ? (
                <FieldBlock label="Notes" value={entry.notes} />
              ) : (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <BookOpen className="size-4" />
                  No notes for this period.
                </p>
              )}
              {!entry.room && !entry.notes && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <DoorOpen className="size-4" />
                  Add a room or notes when you edit this period.
                </p>
              )}
            </div>
          </div>
        </div>

        <EditTimetablePeriodDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          entry={entry}
          onSaved={() => setEditOpen(false)}
        />

        <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this period?</AlertDialogTitle>
              <AlertDialogDescription>
                “{entry.subject} · {entry.classGrade}” ({dayLabel},{" "}
                {formatTime12(entry.startTime)} – {formatTime12(entry.endTime)}) will
                be permanently removed. This cannot be undone.
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