"use client";

import { LoaderCircle } from "lucide-react";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Task } from "@/lib/api/types";

export type TaskInput = {
  title: string;
  description?: string;
  priority: Task["priority"];
  scheduledStart?: string;
  scheduledEnd?: string;
};

function toLocalDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function TaskForm({
  task,
  pending,
  apiError,
  onCancel,
  onSubmit,
}: {
  task?: Task;
  pending: boolean;
  apiError?: string;
  onCancel: () => void;
  onSubmit: (input: TaskInput) => void;
}) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [priority, setPriority] = useState<Task["priority"]>(task?.priority ?? "MEDIUM");
  const [scheduledStart, setScheduledStart] = useState(toLocalDateTime(task?.scheduledStart ?? null));
  const [scheduledEnd, setScheduledEnd] = useState(toLocalDateTime(task?.scheduledEnd ?? null));
  const [validationError, setValidationError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setValidationError("Task title is required.");
      return;
    }
    if (scheduledStart && scheduledEnd && new Date(scheduledEnd) <= new Date(scheduledStart)) {
      setValidationError("End time must be later than the start time.");
      return;
    }

    setValidationError("");
    onSubmit({
      title: cleanTitle,
      description: description.trim() || undefined,
      priority,
      ...(scheduledStart ? { scheduledStart: new Date(scheduledStart).toISOString() } : {}),
      ...(scheduledEnd ? { scheduledEnd: new Date(scheduledEnd).toISOString() } : {}),
    });
  }

  return (
    <form className="mt-6 space-y-5" onSubmit={submit}>
      <div className="space-y-2">
        <label className="text-sm font-semibold" htmlFor="task-title">Title</label>
        <Input id="task-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} placeholder="What needs to get done?" autoFocus required />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold" htmlFor="task-description">Description</label>
        <textarea
          id="task-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={2000}
          rows={4}
          placeholder="Add useful context"
          className="w-full resize-y rounded-md border border-border bg-white px-3 py-2.5 text-sm outline-none transition placeholder:text-[#96a098] focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold" htmlFor="task-priority">Priority</label>
        <select
          id="task-priority"
          value={priority}
          onChange={(event) => setPriority(event.target.value as Task["priority"])}
          className="h-11 w-full rounded-md border border-border bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
        >
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
        </select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-semibold" htmlFor="task-start">Start</label>
          <Input id="task-start" type="datetime-local" value={scheduledStart} onChange={(event) => setScheduledStart(event.target.value)} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold" htmlFor="task-end">End</label>
          <Input id="task-end" type="datetime-local" value={scheduledEnd} onChange={(event) => setScheduledEnd(event.target.value)} />
        </div>
      </div>

      {(validationError || apiError) && (
        <p className="rounded-md border border-coral/30 bg-coral/10 px-3 py-2.5 text-sm text-[#8d3f30]" role="alert">
          {validationError || apiError}
        </p>
      )}

      <div className="flex justify-end gap-2 border-t border-border pt-5">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={pending}>
          {pending && <LoaderCircle className="animate-spin" size={17} />}
          {task ? "Save changes" : "Create task"}
        </Button>
      </div>
    </form>
  );
}
