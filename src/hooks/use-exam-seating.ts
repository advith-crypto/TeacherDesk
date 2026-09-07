import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

export type SeatingPlanItem = {
  _id: Id<"examSeatingPlans">;
  title: string;
  examName: string;
  examDate: string;
  startTime?: string;
  durationMinutes?: number;
  room?: string;
  rows: number;
  columns: number;
  notes?: string;
  status: string;
  assignedCount: number;
  completedAt?: number;
  updatedAt?: number;
  _creationTime: number;
};

export type SeatingAssignmentItem = {
  _id: Id<"examSeatingAssignments">;
  seatingPlanId: Id<"examSeatingPlans">;
  studentIdentifier: string;
  row: number;
  column: number;
  updatedAt?: number;
  _creationTime: number;
};

export type SeatingPlanDetail = {
  plan: SeatingPlanItem;
  assignments: SeatingAssignmentItem[];
};

export function useSeatingPlans() {
  const plans = useQuery(api.examSeating.listSeatingPlans) as
    | SeatingPlanItem[]
    | undefined;
  return plans;
}

export function useSeatingPlanDetail(planId: Id<"examSeatingPlans"> | null) {
  const detail = useQuery(
    api.examSeating.getSeatingPlanDetail,
    planId ? { planId } : "skip",
  ) as SeatingPlanDetail | undefined;
  return detail;
}

export function useSeatingSummary() {
  const summary = useQuery(api.examSeating.getSeatingSummary);
  return summary;
}

export function useSeatingMutations() {
  const create = useMutation(api.examSeating.createSeatingPlan);
  const update = useMutation(api.examSeating.updateSeatingPlan);
  const remove = useMutation(api.examSeating.deleteSeatingPlan);
  const assign = useMutation(api.examSeating.assignSeat);
  const updateAssignment = useMutation(api.examSeating.updateAssignment);
  const removeAssignment = useMutation(api.examSeating.removeAssignment);
  const autoArrange = useMutation(api.examSeating.autoArrangeSeats);
  const shuffle = useMutation(api.examSeating.shuffleAssignments);
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
    createPlan: (input: {
      title: string;
      examName: string;
      examDate: string;
      startTime?: string;
      durationMinutes?: number;
      room?: string;
      rows: number;
      columns: number;
      notes?: string;
      status?: string;
    }) => run(() => create({ input }), "Seating plan created"),
    updatePlan: (
      planId: Id<"examSeatingPlans">,
      patch: {
        title?: string;
        examName?: string;
        examDate?: string;
        startTime?: string | null;
        durationMinutes?: number | null;
        room?: string | null;
        rows?: number;
        columns?: number;
        notes?: string | null;
        status?: string;
      },
    ) => run(() => update({ planId, patch }), "Seating plan updated"),
    deletePlan: (planId: Id<"examSeatingPlans">) =>
      run(() => remove({ planId }), "Seating plan deleted"),
    assignSeat: (input: {
      planId: Id<"examSeatingPlans">;
      row: number;
      column: number;
      studentIdentifier: string;
    }) => run(() => assign(input), "Student seated"),
    updateAssignment: (
      assignmentId: Id<"examSeatingAssignments">,
      patch: { studentIdentifier?: string; row?: number; column?: number },
    ) => run(() => updateAssignment({ assignmentId, patch }), "Assignment updated"),
    removeAssignment: (assignmentId: Id<"examSeatingAssignments">) =>
      run(() => removeAssignment({ assignmentId }), "Student removed from seat"),
    autoArrange: (
      planId: Id<"examSeatingPlans">,
      studentIdentifiers: string[],
    ) => run(() => autoArrange({ planId, studentIdentifiers }), "Seats arranged"),
    shuffle: (planId: Id<"examSeatingPlans">) =>
      run(() => shuffle({ planId }), "Seats shuffled"),
  };
}