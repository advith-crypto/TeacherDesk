import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

export type SubtaskItem = {
  _id: Id<"subtasks">;
  title: string;
  isCompleted: boolean;
  position: number;
};

export type TaskItem = {
  _id: Id<"tasks">;
  title: string;
  description?: string;
  category: string;
  priority: string;
  status: string;
  dueDate?: string;
  dueTime?: string;
  completedAt?: number;
  _creationTime: number;
  subtasks: SubtaskItem[];
};

export function useTasks() {
  const tasks = useQuery(api.tasks.listTasks) as TaskItem[] | undefined;
  return tasks;
}

export function useProfile() {
  const profile = useQuery(api.profiles.getProfile);
  return profile;
}

export function useTaskMutations() {
  const create = useMutation(api.tasks.createTask);
  const update = useMutation(api.tasks.updateTask);
  const remove = useMutation(api.tasks.deleteTask);
  const addSub = useMutation(api.tasks.addSubtask);
  const toggleSub = useMutation(api.tasks.toggleSubtask);
  const deleteSub = useMutation(api.tasks.deleteSubtask);
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
    createTask: (input: {
      title: string;
      description?: string;
      category: string;
      priority: string;
      status: string;
      dueDate?: string;
      dueTime?: string;
      subtasks?: { title: string }[];
    }) => run(() => create({ input }), "Task created"),
    updateTask: (
      taskId: Id<"tasks">,
      patch: {
        title?: string;
        description?: string | null;
        category?: string;
        priority?: string;
        status?: string;
        dueDate?: string | null;
        dueTime?: string | null;
      },
    ) => run(() => update({ taskId, patch })),
    deleteTask: (taskId: Id<"tasks">) => run(() => remove({ taskId }), "Task deleted"),
    addSubtask: (taskId: Id<"tasks">, title: string) =>
      run(() => addSub({ taskId, title })),
    toggleSubtask: (subtaskId: Id<"subtasks">) => run(() => toggleSub({ subtaskId })),
    deleteSubtask: (subtaskId: Id<"subtasks">) => run(() => deleteSub({ subtaskId })),
  };
}

export function useAuthState() {
  const { isLoading: isAuthLoading, isAuthenticated } = useConvexAuth();
  const { signIn, signOut } = useAuthActions();
  return { isAuthLoading, isAuthenticated, signIn, signOut };
}
