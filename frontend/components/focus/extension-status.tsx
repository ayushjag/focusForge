"use client";

import { useQuery } from "@tanstack/react-query";
import { RefreshCw, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ApiError, apiRequest } from "@/lib/api/client";
import type { User } from "@/lib/api/types";
import release from "@/public/downloads/extension-release.json";

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

export function ExtensionStatus({ showSetupLink = true }: { showSetupLink?: boolean }) {
  const user = useQuery({ queryKey: ["auth", "me"], queryFn: () => apiRequest<User>("/api/auth/me"), retry: false });
  const connection = useQuery({ queryKey: ["extension", "connection"], queryFn: checkExtension, enabled: user.isSuccess, refetchInterval: 60_000, staleTime: 0 });
  const signInRequired = user.error instanceof ApiError && user.error.status === 401;
  const mismatch = connection.data?.status === "connected" && user.data && connection.data.userId !== user.data.id;
  const connected = connection.data?.status === "connected" && Boolean(user.data) && !mismatch;
  const label = user.isPending ? "Checking account..." : signInRequired ? "Sign in to verify connection" : user.isError ? "Account check unavailable" :
    connection.isFetching ? "Checking extension..." : mismatch ? "Different account connected" : connected ? "Extension connected" :
    connection.data?.status === "signed-out" ? "Extension sign-in required" : connection.data?.status === "unavailable" ? "Extension sync unavailable" : "Extension not detected";
  return (
    <div className="flex items-start gap-3 border-t border-border pt-5" role="status">
      <ShieldCheck size={18} className={`mt-0.5 shrink-0 ${connected ? "text-primary" : "text-muted"}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        {!connected && !connection.isFetching && !user.isPending && <p className="mt-1 text-xs text-muted">
          {signInRequired ? "Create an account or sign in on this website first." : user.isError ? "Check your connection and retry." :
            mismatch || connection.data?.status === "signed-out" ? "Sign in to the extension with this website account." :
            connection.data?.status === "unavailable" ? "Blocking could not be verified. Check the extension and retry." :
              `Load or reload FocusForge v${release.version}, then refresh this tab. Without it, only the timer will run.`}
        </p>}
        {!connected && showSetupLink && !user.isPending && <Link className="mt-2 inline-block text-xs font-semibold text-primary hover:text-primary-hover" href="/setup">Set up extension</Link>}
      </div>
      <Button variant="ghost" size="icon" aria-label="Check extension connection" title="Check extension connection" disabled={connection.isFetching || user.isPending} onClick={() => { if (user.isError) void user.refetch(); else void connection.refetch(); }}>
        <RefreshCw size={15} className={connection.isFetching ? "animate-spin" : ""} />
      </Button>
    </div>
  );
}
