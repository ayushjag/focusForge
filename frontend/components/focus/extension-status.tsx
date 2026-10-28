"use client";

import { useQuery } from "@tanstack/react-query";
import { RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api/client";
import type { User } from "@/lib/api/types";

type Connection = { status: "connected" | "signed-out" | "unavailable" | "not-detected"; userId?: string };

function checkExtension(): Promise<Connection> {
  return new Promise((resolve) => {
    const requestId = crypto.randomUUID();
    const finish = (result: Connection) => {
      window.clearTimeout(timeout);
      window.removeEventListener("message", receive);
      resolve(result);
    };
    const receive = (event: MessageEvent) => {
      if (event.source !== window || event.origin !== window.location.origin ||
        event.data?.type !== "FOCUSFORGE_EXTENSION_STATUS" || event.data.requestId !== requestId) return;
      const { status, userId } = event.data;
      if (["connected", "signed-out", "unavailable"].includes(status)) finish({ status, userId });
    };
    const timeout = window.setTimeout(() => finish({ status: "not-detected" }), 12_000);
    window.addEventListener("message", receive);
    window.postMessage({ type: "FOCUSFORGE_CHECK_EXTENSION", requestId }, window.location.origin);
  });
}

export function ExtensionStatus() {
  const user = useQuery({ queryKey: ["auth", "me"], queryFn: () => apiRequest<User>("/api/auth/me"), retry: false });
  const connection = useQuery({ queryKey: ["extension", "connection"], queryFn: checkExtension, refetchInterval: 60_000, staleTime: 0 });
  const mismatch = connection.data?.status === "connected" && user.data && connection.data.userId !== user.data.id;
  const connected = connection.data?.status === "connected" && Boolean(user.data) && !mismatch;
  const label = connection.isFetching ? "Checking extension..." : mismatch ? "Different account connected" : connected ? "Extension connected" :
    connection.data?.status === "signed-out" ? "Extension sign-in required" : connection.data?.status === "unavailable" ? "Extension sync unavailable" : "Extension not detected";
  return (
    <div className="flex items-start gap-3 border-t border-border pt-5" role="status">
      <ShieldCheck size={18} className={`mt-0.5 shrink-0 ${connected ? "text-primary" : "text-muted"}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        {!connected && !connection.isFetching && <p className="mt-1 text-xs text-muted">
          {mismatch || connection.data?.status === "signed-out" ? "Sign in to the extension with this website account." :
            connection.data?.status === "unavailable" ? "Blocking could not be verified. Check the extension and retry." :
              "Load or reload FocusForge v0.8.0, then refresh this tab. Without it, only the timer will run."}
        </p>}
      </div>
      <Button variant="ghost" size="icon" aria-label="Check extension connection" title="Check extension connection" disabled={connection.isFetching} onClick={() => connection.refetch()}>
        <RefreshCw size={15} className={connection.isFetching ? "animate-spin" : ""} />
      </Button>
    </div>
  );
}
