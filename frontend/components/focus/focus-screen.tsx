"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock3, History, LoaderCircle, Play, ShieldCheck, Square } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/api/client";
import type { FocusSession, Task } from "@/lib/api/types";
import { requestExtensionSync } from "@/lib/extension-sync";
import { cn } from "@/lib/utils";

const durations = [25, 45, 60];

function formatClock(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatSessionDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

const historyBadge: Record<FocusSession["status"], "green" | "yellow" | "pink" | "muted"> = {
  ACTIVE: "yellow",
  COMPLETED: "green",
  CANCELLED: "pink",
  EXPIRED: "muted",
};

export function FocusScreen() {
  const queryClient = useQueryClient();
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [duration, setDuration] = useState(25);
  const [now, setNow] = useState(0);
  const [cancelOpen, setCancelOpen] = useState(false);

  const tasksQuery = useQuery({ queryKey: ["tasks"], queryFn: () => apiRequest<Task[]>("/api/backend/tasks") });
  const activeQuery = useQuery({
    queryKey: ["sessions", "active"],
    queryFn: () => apiRequest<FocusSession | null>("/api/backend/sessions/active"),
    refetchInterval: 15_000,
  });
  const historyQuery = useQuery({
    queryKey: ["sessions"],
    queryFn: () => apiRequest<FocusSession[]>("/api/backend/sessions"),
  });

  const refreshSessions = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["sessions"] }),
      queryClient.invalidateQueries({ queryKey: ["sessions", "active"] }),
      queryClient.invalidateQueries({ queryKey: ["analytics", "summary"] }),
    ]);
  }, [queryClient]);
  const startSession = useMutation({
    mutationFn: ({ taskId, minutes }: { taskId: string; minutes: number }) =>
      apiRequest<FocusSession>("/api/backend/sessions/start", {
        method: "POST",
        body: JSON.stringify({ taskId, durationMinutes: minutes }),
      }),
    onSuccess: async () => {
      requestExtensionSync();
      await refreshSessions();
    },
  });
  const completeSession = useMutation({
    mutationFn: (id: string) => apiRequest<FocusSession>(`/api/backend/sessions/${id}/complete`, { method: "POST" }),
    onSuccess: async () => {
      requestExtensionSync();
      await refreshSessions();
    },
  });
  const cancelSession = useMutation({
    mutationFn: (id: string) => apiRequest<FocusSession>(`/api/backend/sessions/${id}/cancel`, { method: "POST" }),
    onSuccess: async () => {
      requestExtensionSync();
      await refreshSessions();
      setCancelOpen(false);
    },
  });

  const activeSession = activeQuery.data ?? null;
  useEffect(() => {
    if (!activeSession) return;
    const update = () => setNow(Date.now());
    update();
    const timer = window.setInterval(update, 1_000);
    return () => window.clearInterval(timer);
  }, [activeSession]);

  const openTasks = (tasksQuery.data ?? []).filter((task) => ["PENDING", "SCHEDULED"].includes(task.status));
  const chosenTaskId = selectedTaskId || openTasks[0]?.id || "";
  const remainingSeconds = activeSession && now
    ? Math.max(0, Math.ceil((new Date(activeSession.plannedEnd).getTime() - now) / 1_000))
    : activeSession?.plannedDurationMinutes ? activeSession.plannedDurationMinutes * 60 : 0;
  const progress = activeSession
    ? Math.min(100, Math.max(0, ((activeSession.plannedDurationMinutes * 60 - remainingSeconds) / (activeSession.plannedDurationMinutes * 60)) * 100))
    : 0;
  const sessionTask = activeSession?.task ?? (tasksQuery.data ?? []).find((task) => task.id === activeSession?.taskId);
  const recentSessions = useMemo(() => (historyQuery.data ?? []).slice(0, 5), [historyQuery.data]);
  const actionError = startSession.error?.message ?? completeSession.error?.message ?? cancelSession.error?.message;

  useEffect(() => {
    if (activeSession && remainingSeconds === 0 && now) void refreshSessions();
  }, [activeSession, now, refreshSessions, remainingSeconds]);

  return (
    <div className="mx-auto max-w-[1280px] px-5 py-7 md:px-8 lg:px-10 lg:py-9">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-muted">Welcome back</p>
          <h1 className="mt-1 text-3xl font-bold">Focus room</h1>
        </div>
        <Badge variant={activeSession ? "green" : "muted"} className="self-start sm:self-auto">
          <span className={cn("mr-1.5 size-1.5 rounded-full", activeSession ? "bg-primary" : "bg-muted")} />
          {activeSession ? "Session active" : "Ready to begin"}
        </Badge>
      </div>

      {actionError && (
        <div className="mt-5 flex items-center justify-between gap-3 rounded-lg bg-[#f8d9d1] px-4 py-3 text-sm font-medium text-[#873f31]">
          <span>{actionError}</span>
          <button onClick={() => { startSession.reset(); completeSession.reset(); cancelSession.reset(); }} className="font-bold">Dismiss</button>
        </div>
      )}

      <div className="mt-7 grid gap-5 xl:grid-cols-[1.35fr_0.85fr]">
        {activeSession ? (
          <Card className="bg-[#ffe6a3] p-1">
            <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
              <div>
                <Badge variant="yellow">Deep focus</Badge>
                <CardTitle className="mt-4 text-2xl">{sessionTask?.title ?? "Focused work"}</CardTitle>
                <CardDescription className="text-[#695b35]">Distraction blocking is synchronized with your extension.</CardDescription>
              </div>
              <span className="flex size-11 items-center justify-center rounded-full bg-white/75"><ShieldCheck size={21} /></span>
            </CardHeader>
            <CardContent>
              <p className="mt-4 font-mono text-6xl font-bold leading-none sm:text-7xl">{formatClock(remainingSeconds)}</p>
              <div className="mt-8 flex items-center justify-between text-xs font-semibold text-[#695b35]">
                <span>{Math.round(progress)}% complete</span>
                <span>{activeSession.plannedDurationMinutes} min session</span>
              </div>
              <Progress className="mt-2 h-2.5 bg-white/60" value={progress} />
              <div className="mt-8 flex flex-col gap-2 sm:flex-row">
                <Button className="sm:flex-1" onClick={() => completeSession.mutate(activeSession.id)} disabled={completeSession.isPending}>
                  {completeSession.isPending ? <LoaderCircle className="animate-spin" size={17} /> : <CheckCircle2 size={17} />}
                  Finish session
                </Button>
                <Button className="sm:flex-1" variant="secondary" onClick={() => setCancelOpen(true)}><Square size={16} />Cancel session</Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-[#cfe8e4] p-1">
            <CardHeader>
              <Badge variant="green">New session</Badge>
              <CardTitle className="mt-4 text-2xl">What will you focus on?</CardTitle>
              <CardDescription className="text-[#4c6964]">Choose one open task and a protected block of time.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold" htmlFor="focus-task">Task</label>
                <Select value={chosenTaskId} onValueChange={setSelectedTaskId} disabled={!openTasks.length}>
                  <SelectTrigger id="focus-task" className="border-0 bg-white/85"><SelectValue placeholder="Choose a task" /></SelectTrigger>
                  <SelectContent>
                    {openTasks.map((task) => <SelectItem key={task.id} value={task.id}>{task.title}</SelectItem>)}
                  </SelectContent>
                </Select>
                {!tasksQuery.isPending && openTasks.length === 0 && <p className="text-xs font-medium text-[#4c6964]">Create an open task before starting a session.</p>}
              </div>
              <div className="space-y-2">
                <p className="text-sm font-bold">Duration</p>
                <div className="grid grid-cols-3 gap-2">
                  {durations.map((minutes) => (
                    <button key={minutes} onClick={() => setDuration(minutes)} className={cn("h-12 rounded-lg bg-white/65 text-sm font-bold transition", duration === minutes && "bg-foreground text-white")}>{minutes} min</button>
                  ))}
                </div>
              </div>
              <Button className="w-full" size="default" disabled={!chosenTaskId || startSession.isPending} onClick={() => startSession.mutate({ taskId: chosenTaskId, minutes: duration })}>
                {startSession.isPending ? <LoaderCircle className="animate-spin" size={18} /> : <Play size={18} />}
                Start focus session
              </Button>
            </CardContent>
          </Card>
        )}

        <Card className="bg-[#f3d7e5]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div><CardTitle>Recent sessions</CardTitle><CardDescription className="text-[#745767]">Your latest focus activity</CardDescription></div>
              <span className="flex size-10 items-center justify-center rounded-full bg-white/70"><History size={19} /></span>
            </div>
          </CardHeader>
          <CardContent>
            {historyQuery.isPending && <div className="flex items-center gap-2 py-8 text-sm text-muted"><LoaderCircle className="animate-spin" size={17} />Loading history</div>}
            {!historyQuery.isPending && recentSessions.length === 0 && <p className="py-8 text-sm text-[#745767]">Your completed sessions will appear here.</p>}
            <div className="space-y-2">
              {recentSessions.map((session) => (
                <div key={session.id} className="flex items-center gap-3 rounded-lg bg-white/70 p-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white"><Clock3 size={16} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{session.task?.title ?? "Focus session"}</p>
                    <p className="mt-0.5 text-xs text-muted">{formatSessionDate(session.actualStart)} · {session.plannedDurationMinutes} min</p>
                  </div>
                  <Badge variant={historyBadge[session.status]}>{session.status.toLowerCase()}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel this session?</DialogTitle>
            <DialogDescription>The session will stop immediately and be recorded as cancelled.</DialogDescription>
          </DialogHeader>
          <div className="mt-6 flex justify-end gap-2 border-t border-border pt-5">
            <DialogClose asChild><Button variant="secondary">Keep focusing</Button></DialogClose>
            <Button className="bg-[#b44f3d] hover:bg-[#943e30]" disabled={cancelSession.isPending} onClick={() => activeSession && cancelSession.mutate(activeSession.id)}>
              {cancelSession.isPending && <LoaderCircle className="animate-spin" size={17} />}
              Cancel session
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
