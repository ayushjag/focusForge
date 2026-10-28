"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle, Plus, Play, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FocusSites } from "./focus-sites";
import { ExtensionStatus } from "./extension-status";
import { apiRequest } from "@/lib/api/client";
import type { Task } from "@/lib/api/types";
import { cn } from "@/lib/utils";

export function FocusSetup({ tasks, selectedTaskId, onSelectTask, onStart, pending, loading, loadError, onRetry }: {
  tasks: Task[]; selectedTaskId: string; onSelectTask: (id: string) => void;
  onStart: (minutes: number) => void; pending: boolean; loading: boolean; loadError?: string; onRetry: () => void;
}) {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [titleError, setTitleError] = useState("");
  const [duration, setDuration] = useState("25");
  const [custom, setCustom] = useState(false);
  const [sitesBusy, setSitesBusy] = useState(false);
  const minutes = Number(duration);
  const durationValid = /^\d+$/.test(duration) && Number.isInteger(minutes) && minutes >= 1 && minutes <= 480;
  const create = useMutation({
    mutationFn: (title: string) => apiRequest<Task>("/api/backend/tasks", { method: "POST", body: JSON.stringify({ title, priority: "MEDIUM" }) }),
    onSuccess: async (task) => {
      queryClient.setQueryData<Task[]>(["tasks"], (old = []) => [task, ...old]);
      onSelectTask(task.id);
      setCreating(false); setTitle(""); setTitleError("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tasks"] }),
        queryClient.invalidateQueries({ queryKey: ["analytics", "summary"] }),
      ]);
    },
  });
  function submitTask(event: FormEvent) {
    event.preventDefault();
    const clean = title.trim();
    if (!clean || clean.length > 120) { setTitleError("Enter a task title between 1 and 120 characters."); return; }
    if (!create.isPending) create.mutate(clean);
  }
  const selected = tasks.some((task) => task.id === selectedTaskId);
  return (
    <section aria-labelledby="session-setup-title" className="min-w-0">
      <div className="mb-6">
        <h2 id="session-setup-title" className="text-xl font-semibold">Set up your session</h2>
        <p className="mt-1 text-sm text-muted">One task. A little protected time.</p>
      </div>
      <div className="space-y-6">
        <section aria-labelledby="focus-task-label">
          <div className="mb-2 flex items-center justify-between gap-3">
            <label id="focus-task-label" className="text-sm font-semibold" htmlFor="focus-task">Task</label>
            {!creating && <Button size="sm" variant="ghost" disabled={pending} onClick={() => { create.reset(); setCreating(true); }}><Plus size={15} />New task</Button>}
          </div>
          {loading ? <p className="text-sm text-muted">Loading tasks...</p> : loadError ? (
            <div><p role="alert" className="text-sm text-[#a84e3d]">{loadError}</p><Button variant="ghost" onClick={onRetry}>Retry tasks</Button></div>
          ) : <Select value={selected ? selectedTaskId : ""} onValueChange={onSelectTask} disabled={pending || !tasks.length}>
            <SelectTrigger id="focus-task"><SelectValue placeholder={tasks.length ? "Choose a task" : "Create your first task below"} /></SelectTrigger>
            <SelectContent>{tasks.map((task) => <SelectItem key={task.id} value={task.id}>{task.title}</SelectItem>)}</SelectContent>
          </Select>}
          {creating && <form className="mt-3" onSubmit={submitTask} noValidate>
            <label className="sr-only" htmlFor="quick-task-title">New task title</label>
            <div className="flex gap-2">
              <Input id="quick-task-title" className="min-w-0 flex-1" placeholder="What needs your attention?" value={title} maxLength={120} autoFocus
                disabled={create.isPending} onChange={(event) => { setTitle(event.target.value); setTitleError(""); create.reset(); }}
                aria-invalid={Boolean(titleError || create.error)} aria-describedby={titleError || create.error ? "quick-task-error" : undefined} />
              <Button type="submit" variant="secondary" disabled={create.isPending}>{create.isPending ? <LoaderCircle size={16} className="animate-spin" /> : <Plus size={16} />}Create</Button>
              <Button type="button" variant="ghost" size="icon" aria-label="Cancel new task" title="Cancel new task" disabled={create.isPending} onClick={() => setCreating(false)}><X size={17} /></Button>
            </div>
            {(titleError || create.error) && <p id="quick-task-error" role="alert" className="mt-2 text-xs text-[#a84e3d]">{titleError || create.error?.message}</p>}
          </form>}
        </section>
        <section aria-labelledby="focus-duration-label">
          <h2 id="focus-duration-label" className="mb-3 text-sm font-semibold">Duration</h2>
          <div className="grid grid-cols-4 gap-2" role="group" aria-label="Session duration">
            {[25, 50, 60].map((value) => <button key={value} type="button" aria-pressed={!custom && minutes === value}
              onClick={() => { setCustom(false); setDuration(String(value)); }}
              className={cn("h-10 rounded-md border border-border text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary", !custom && minutes === value ? "border-foreground bg-foreground text-white" : "bg-white")}>{value} min</button>)}
            <button type="button" aria-pressed={custom} onClick={() => setCustom(true)} className={cn("h-10 rounded-md border border-border text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary", custom ? "border-foreground bg-foreground text-white" : "bg-white")}>Custom</button>
          </div>
          {custom && <div className="mt-3">
            <label htmlFor="custom-minutes" className="text-xs text-muted">Minutes (1-480)</label>
            <Input id="custom-minutes" className="mt-1 max-w-40" type="number" min={1} max={480} step={1} value={duration} onChange={(event) => setDuration(event.target.value)} aria-invalid={!durationValid} aria-describedby={!durationValid ? "duration-error" : undefined} />
            {!durationValid && <p id="duration-error" role="alert" className="mt-2 text-xs text-[#a84e3d]">Choose a whole number between 1 and 480 minutes.</p>}
          </div>}
        </section>
        <FocusSites onBusyChange={setSitesBusy} />
        <ExtensionStatus />
        <Button className="w-full" disabled={!selected || !durationValid || pending || loading || Boolean(loadError) || create.isPending || sitesBusy || creating} onClick={() => onStart(minutes)}>
          {pending ? <LoaderCircle className="animate-spin" size={18} /> : <Play size={18} />}Start focus session
        </Button>
      </div>
    </section>
  );
}
