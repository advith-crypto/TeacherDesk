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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { seatLabel } from "@/lib/exam-seating-shared";
import {
  useSeatingMutations,
  type SeatingAssignmentItem,
} from "@/hooks/use-exam-seating";
import type { Id } from "@/convex/_generated/dataModel";
import { Trash2 } from "lucide-react";
import { useState } from "react";

/**
 * Assign / edit / remove a student at one seat. Tapping an occupied seat
 * pre-fills the current identifier; the backend still protects against
 * duplicate identifiers and double-seating.
 */
export function SeatAssignDialog({
  open,
  onOpenChange,
  planId,
  seat,
  assignment,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: Id<"examSeatingPlans">;
  seat: { row: number; column: number } | null;
  assignment: SeatingAssignmentItem | null;
}) {
  const { assignSeat, updateAssignment, removeAssignment, pending } =
    useSeatingMutations();
  const [identifier, setIdentifier] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  // Reset the input whenever the dialog opens (guarded render-time pattern).
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setIdentifier(assignment?.studentIdentifier ?? "");
      setError(null);
    }
  }

  if (!seat) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = identifier.trim();
    if (!value) return setError("Please enter a student identifier.");
    try {
      if (assignment) {
        await updateAssignment(assignment._id, { studentIdentifier: value });
      } else {
        await assignSeat({
          planId,
          row: seat.row,
          column: seat.column,
          studentIdentifier: value,
        });
      }
      onOpenChange(false);
    } catch {
      // error toast already shown by the hook
    }
  };

  const handleRemove = async () => {
    if (!assignment) return;
    await removeAssignment(assignment._id);
    setConfirmRemove(false);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Seat {seatLabel(seat.row, seat.column)}
            </DialogTitle>
            <DialogDescription>
              {assignment
                ? `Currently assigned to ${assignment.studentIdentifier}. Enter a new identifier to update, or remove the student.`
                : "Enter the student identifier to assign to this seat."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="seat-student">Student identifier</Label>
              <Input
                id="seat-student"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. 9A-01"
                autoCapitalize="characters"
                autoComplete="off"
                required
              />
              <p className="text-xs text-muted-foreground">
                Identifiers are per-plan, e.g. 9A-01, Student 101.
              </p>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter className="mt-1 flex-col gap-2 sm:flex-row sm:justify-between">
              <div className="flex gap-2">
                {assignment && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setConfirmRemove(true)}
                    disabled={pending}
                  >
                    <Trash2 className="size-4" />
                    Remove
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  className="sm:hidden"
                  onClick={() => onOpenChange(false)}
                  disabled={pending}
                >
                  Cancel
                </Button>
              </div>
              <Button type="submit" disabled={pending}>
                {assignment ? "Save changes" : "Assign seat"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {assignment?.studentIdentifier}?</AlertDialogTitle>
            <AlertDialogDescription>
              They will be unassigned from seat{" "}
              {assignment ? seatLabel(assignment.row, assignment.column) : ""}.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                handleRemove();
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}