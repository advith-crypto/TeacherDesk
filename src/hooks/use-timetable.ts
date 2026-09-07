import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

export type TimetableEntryItem = {
  _id: Id<"timetableEntries">;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  subject: string;
  classGrade: string;
  section?: string;
  room?: string;
  notes?: string;
  updatedAt?: number;
  _creationTime: number;
};

export function useTimetableEntries() {
  const entries = useQuery(api.timetable.listTimetableEntries) as
    | TimetableEntryItem[]
    | undefined;
  return entries;
}

export function useTimetableSummary() {
  const summary = useQuery(api.timetable.getTimetableSummary);
  return summary;
}

export function useTimetableMutations() {
  const create = useMutation(api.timetable.createTimetableEntry);
  const update = useMutation(api.timetable.updateTimetableEntry);
  const remove = useMutation(api.timetable.deleteTimetableEntry);
  const [pending, setPending] = useState(false);

  const run = useCallback(
    async <T,>(fn: () => Promise<T>, successMessage?: string): Promise<T | undefined> => {
      setPending(true);
      try {
        const result = await fn();
        if (successMessage) toast.success(successMessage);
        return result;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
        return undefined;
      } finally {
        setPending(false);
      }
    },
    [],
  );

  return {
    pending,
    createEntry: (input: {
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      subject: string;
      classGrade: string;
      section?: string;
      room?: string;
      notes?: string;
    }) => run(() => create({ input }), "Period added"),
    updateEntry: (
      entryId: Id<"timetableEntries">,
      patch: {
        dayOfWeek?: number;
        startTime?: string;
        endTime?: string;
        subject?: string;
        classGrade?: string;
        section?: string | null;
        room?: string | null;
        notes?: string | null;
      },
    ) => run(() => update({ entryId, patch }), "Period updated"),
    deleteEntry: (entryId: Id<"timetableEntries">) =>
      run(() => remove({ entryId }), "Period removed"),
  };
}