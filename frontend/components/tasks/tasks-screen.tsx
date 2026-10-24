"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarClock,
  Check,
  CheckCircle2,
  Circle,
  ListFilter,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { TaskForm, type TaskInput } from "@/components/tasks/task-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/api/client";
import type { Task } from "@/lib/api/types";
import { cn } from "@/lib/utils";

type Filter = "ALL" | "OPEN" | "COMPLETED";

function formatSchedule(task: Task) {
  if (!task.scheduledStart) return "No schedule";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(task.scheduledStart));
}

const statusStyles: Record<Task["status"], string> = {
  PENDING: "bg-surface-soft text-muted",
  SCHEDULED: "bg-[#e5f0e1] text-primary",
  COMPLETED: "bg-[#dcf4e8] text-[#17633f]",
  MISSED: "bg-coral/10 text-[#a84e3d]",
  CANCELLED: "bg-[#f0eeee] text-[#766c6c]",
};

export function TasksScreen() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task>();
  const [deletingTask, setDeletingTask] = useState<Task>();

  const tasksQuery = useQuery({
    queryKey: ["tasks"],
    queryFn: () => apiRequest<Task[]>("/api/backend/tasks"),
  });

  const refreshTasks = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["tasks"] }),
    queryClient.invalidateQueries({ queryKey: ["analytics", "summary"] }),
  ]);
  const createTask = useMutation({
    mutationFn: (input: TaskInput) =>
      apiRequest<Task>("/api/backend/tasks", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: async () => {
      await refreshTasks();
      setEditorOpen(false);
    },
  });
  const updateTask = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<TaskInput> & { status?: Task["status"] } }) =>
      apiRequest<Task>(`/api/backend/tasks/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
    onSuccess: async () => {
      await refreshTasks();
      setEditorOpen(false);
      setEditingTask(undefined);
    },
  });
  const deleteTask = useMutation({
    mutationFn: (id: string) =>
      apiRequest<never>(`/api/backend/tasks/${id}`, { method: "DELETE" }),
    onSuccess: async () => {
      await refreshTasks();
      setDeletingTask(undefined);
    },
  });

  const tasks = tasksQuery.data ?? [];
  const visibleTasks = (() => {
    const term = search.trim().toLowerCase();
    return tasks.filter((task) => {
      const matchesSearch = !term || task.title.toLowerCase().includes(term) || task.description?.toLowerCase().includes(term);
      const matchesFilter =
        filter === "ALL" ||
        (filter === "OPEN" && ["PENDING", "SCHEDULED"].includes(task.status)) ||
        (filter === "COMPLETED" && task.status === "COMPLETED");
      return matchesSearch && matchesFilter;
    });
  })();

  function openCreate() {
    setEditingTask(undefined);
    createTask.reset();
    updateTask.reset();
    setEditorOpen(true);
  }

  function openEdit(task: Task) {
    setEditingTask(task);
    createTask.reset();
    updateTask.reset();
    setEditorOpen(true);
  }

  function submitTask(input: TaskInput) {
    if (editingTask) updateTask.mutate({ id: editingTask.id, input });
    else createTask.mutate(input);
  }

  const openCount = tasks.filter((task) => ["PENDING", "SCHEDULED"].includes(task.status)).length;
  const completedCount = tasks.filter((task) => task.status === "COMPLETED").length;
  const mutationError = createTask.error?.message ?? updateTask.error?.message;

  return (
    <div className="mx-auto max-w-[1320px] px-5 py-7 md:px-8 lg:px-10 lg:py-9">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-primary">Plan your work</p>
          <h1 className="mt-1 text-3xl font-bold">Tasks</h1>
          <p className="mt-2 text-sm text-muted">Keep the next action clear and ready for a focus session.</p>
        </div>
        <Button onClick={openCreate}><Plus size={18} />New task</Button>
      </div>

      <section className="mt-7 grid gap-3 sm:grid-cols-3" aria-label="Task summary">
        {[
          { label: "Total tasks", value: tasks.length, icon: ListFilter, card: "bg-[#cfe8e4]", tone: "bg-white/70 text-primary" },
          { label: "Open", value: openCount, icon: Circle, card: "bg-[#ffe6a3]", tone: "bg-white/70 text-[#9c6817]" },
          { label: "Completed", value: completedCount, icon: CheckCircle2, card: "bg-[#d9cfee]", tone: "bg-white/70 text-[#604a83]" },
        ].map(({ label, value, icon: Icon, card, tone }) => (
          <div className={cn("flex items-center gap-4 rounded-lg p-4", card)} key={label}>
            <span className={cn("flex size-10 items-center justify-center rounded-full", tone)}><Icon size={19} /></span>
            <div><p className="text-2xl font-bold">{value}</p><p className="text-xs font-medium text-muted">{label}</p></div>
          </div>
        ))}
      </section>

      <section className="mt-4 rounded-lg bg-white">
        <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={17} />
            <Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tasks" aria-label="Search tasks" />
          </div>
          <div className="grid grid-cols-3 rounded-md border border-border bg-surface-soft p-1" aria-label="Filter tasks">
            {(["ALL", "OPEN", "COMPLETED"] as Filter[]).map((option) => (
              <button
                key={option}
                onClick={() => setFilter(option)}
                className={cn("h-8 rounded px-3 text-xs font-bold text-muted", filter === option && "bg-white text-foreground shadow-sm")}
              >
                {option.charAt(0) + option.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {updateTask.error && !editorOpen && (
          <div className="mx-4 mt-4 flex items-center justify-between gap-3 rounded-md border border-coral/30 bg-coral/10 px-3 py-2.5 text-sm text-[#8d3f30]">
            <span>{updateTask.error.message}</span>
            <button className="shrink-0 font-bold" onClick={() => updateTask.reset()}>Dismiss</button>
          </div>
        )}

        {tasksQuery.isPending && (
          <div className="flex items-center justify-center gap-2 px-5 py-16 text-sm text-muted"><LoaderCircle className="animate-spin" size={18} />Loading tasks</div>
        )}
        {tasksQuery.error && (
          <div className="px-5 py-16 text-center"><p className="text-sm font-semibold text-coral">Tasks could not be loaded.</p><Button className="mt-4" variant="secondary" onClick={() => tasksQuery.refetch()}>Try again</Button></div>
        )}
        {!tasksQuery.isPending && !tasksQuery.error && visibleTasks.length === 0 && (
          <div className="px-5 py-16 text-center">
            <CheckCircle2 className="mx-auto text-primary" size={30} />
            <p className="mt-3 text-sm font-semibold">No matching tasks</p>
            <p className="mt-1 text-xs text-muted">Adjust the filter or add a new task.</p>
          </div>
        )}
        {visibleTasks.length > 0 && (
          <div className="divide-y divide-border">
            {visibleTasks.map((task) => (
              <article className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:px-5" key={task.id}>
                <button
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full border transition",
                    task.status === "COMPLETED" ? "border-primary bg-primary text-white" : "border-[#b8c1ba] text-transparent hover:border-primary hover:text-primary",
                  )}
                  onClick={() => updateTask.mutate({ id: task.id, input: { status: task.status === "COMPLETED" ? "PENDING" : "COMPLETED" } })}
                  aria-label={task.status === "COMPLETED" ? `Mark ${task.title} open` : `Complete ${task.title}`}
                  title={task.status === "COMPLETED" ? "Mark open" : "Mark complete"}
                >
                  <Check size={16} />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className={cn("text-sm font-semibold", task.status === "COMPLETED" && "text-muted line-through")}>{task.title}</h2>
                    <span className={cn("rounded px-2 py-1 text-[10px] font-bold", statusStyles[task.status])}>{task.status.toLowerCase()}</span>
                    <span className={cn(
                      "rounded px-2 py-1 text-[10px] font-bold",
                      task.priority === "HIGH" && "bg-coral/10 text-[#a84e3d]",
                      task.priority === "MEDIUM" && "bg-amber/15 text-[#936115]",
                      task.priority === "LOW" && "bg-surface-soft text-muted",
                    )}>{task.priority.toLowerCase()}</span>
                  </div>
                  {task.description && <p className="mt-1 truncate text-xs text-muted">{task.description}</p>}
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-muted"><CalendarClock size={14} />{formatSchedule(task)}</p>
                </div>
                <div className="flex items-center gap-1 self-end md:self-auto">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(task)} aria-label={`Edit ${task.title}`} title="Edit task"><Pencil size={17} /></Button>
                  <Button variant="ghost" size="icon" className="hover:bg-coral/10 hover:text-[#a84e3d]" onClick={() => setDeletingTask(task)} aria-label={`Delete ${task.title}`} title="Delete task"><Trash2 size={17} /></Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTask ? "Edit task" : "Create task"}</DialogTitle>
            <DialogDescription>{editingTask ? "Update the task details and schedule." : "Add a clear piece of work to your focus queue."}</DialogDescription>
          </DialogHeader>
          <TaskForm
            key={editingTask?.id ?? "new"}
            task={editingTask}
            pending={createTask.isPending || updateTask.isPending}
            apiError={mutationError}
            onCancel={() => setEditorOpen(false)}
            onSubmit={submitTask}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deletingTask)} onOpenChange={(open) => !open && setDeletingTask(undefined)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete task?</DialogTitle>
            <DialogDescription>This will permanently remove “{deletingTask?.title}”. Focus sessions already linked to it may prevent deletion.</DialogDescription>
          </DialogHeader>
          {deleteTask.error && <p className="mt-4 rounded-md bg-coral/10 px-3 py-2.5 text-sm text-[#8d3f30]">{deleteTask.error.message}</p>}
          <div className="mt-6 flex justify-end gap-2 border-t border-border pt-5">
            <DialogClose asChild><Button variant="secondary">Cancel</Button></DialogClose>
            <Button className="bg-[#b44f3d] hover:bg-[#943e30]" disabled={deleteTask.isPending} onClick={() => deletingTask && deleteTask.mutate(deletingTask.id)}>
              {deleteTask.isPending && <LoaderCircle className="animate-spin" size={17} />}
              Delete task
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
