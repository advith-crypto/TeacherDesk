import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { capacity } from "@/lib/exam-seating-shared";
import { useSeatingMutations } from "@/hooks/use-exam-seating";
import type { Id } from "@/convex/_generated/dataModel";
import { Shuffle, Wand2 } from "lucide-react";
import { useMemo, useState } from "react";

/**
 * Auto Arrange + Shuffle for one plan. Pasting identifiers (one per line,
 * comma or semicolon separated) places them deterministically row-major:
 * R1C1, R1C2, … Duplicates and over-capacity lists are rejected up front.
 */
export function AutoArrangePanel({
  planId,
  rows,
  columns,
  hasAssignments,
}: {
  planId: Id<"examSeatingPlans">;
  rows: number;
  columns: number;
  hasAssignments: boolean;
}) {
  const { autoArrange, shuffle, pending } = useSeatingMutations();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const identifiers = useMemo(
    () =>
      text
        .split(/[\n,;]+/)
        .map((s) => s.trim())
        .filter(Boolean),
    [text],
  );
  const cap = capacity(rows, columns);
  const overCapacity = identifiers.length > cap;
  const hasDuplicates = useMemo(() => {
    const seen = new Set<string>();
    for (const id of identifiers) {
      const key = id.toLowerCase();
      if (seen.has(key)) return true;
      seen.add(key);
    }
    return false;
  }, [identifiers]);

  const handleArrange = async () => {
    if (identifiers.length === 0) {
      setError("Enter at least one student identifier first.");
      return;
    }
    if (hasDuplicates) {
      setError("The list contains duplicate student identifiers.");
      return;
    }
    if (overCapacity) {
      setError(
        `Too many students: capacity is ${cap} seats but ${identifiers.length} were provided. No changes were made.`,
      );
      return;
    }
    setError(null);
    const ok = await autoArrange(planId, identifiers);
    if (ok) setText("");
  };

  const handleShuffle = async () => {
    setError(null);
    await shuffle(planId);
  };

  return (
    <div className="card-soft flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="font-semibold">Auto arrange</p>
          <p className="text-xs text-muted-foreground">
            Paste a list — students are placed R1C1, R1C2, … in order. Replaces
            the current arrangement.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-10 shrink-0 gap-1.5"
          onClick={handleShuffle}
          disabled={pending || !hasAssignments}
        >
          <Shuffle className="size-4" />
          Shuffle
        </Button>
      </div>

      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={"9A-01\n9A-02\n9A-03\n9B-01"}
        aria-label="Student identifiers for auto arrange"
        className="min-h-24 font-mono text-sm"
        rows={3}
      />

      {identifiers.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {identifiers.length} {identifiers.length === 1 ? "student" : "students"} ·{" "}
          {cap} {cap === 1 ? "seat" : "seats"} capacity
          {overCapacity && (
            <span className="font-medium text-destructive">
              {" "}— too many for this grid
            </span>
          )}
          {hasDuplicates && (
            <span className="font-medium text-destructive">
              {" "}— duplicate identifiers detected
            </span>
          )}
        </p>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        type="button"
        className="h-11 gap-2"
        onClick={handleArrange}
        disabled={pending || identifiers.length === 0 || overCapacity || hasDuplicates}
      >
        <Wand2 className="size-4" />
        Auto arrange
      </Button>
    </div>
  );
}