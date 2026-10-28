"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Globe2, LoaderCircle, Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/api/client";
import type { BlockedWebsite } from "@/lib/api/types";
import { requestExtensionSync } from "@/lib/extension-sync";
import { validateDomainInput } from "@/lib/validation/domain";

export function FocusSites({ onBusyChange }: { onBusyChange?: (busy: boolean) => void }) {
  const queryClient = useQueryClient();
  const [domain, setDomain] = useState("");
  const [touched, setTouched] = useState(false);
  const sites = useQuery({ queryKey: ["blocked-websites"], queryFn: () => apiRequest<BlockedWebsite[]>("/api/backend/blocked-websites") });
  const save = useMutation({
    mutationFn: ({ id, enabled, domain }: { id?: string; enabled?: boolean; domain?: string }) =>
      apiRequest<BlockedWebsite>(`/api/backend/blocked-websites${id ? `/${id}` : ""}`, {
        method: id ? "PATCH" : "POST", body: JSON.stringify(id ? { enabled } : { domain }),
      }),
    onMutate: () => onBusyChange?.(true),
    onSuccess: async (_site, input) => {
      if (!input.id) { setDomain(""); setTouched(false); }
      requestExtensionSync();
      await queryClient.invalidateQueries({ queryKey: ["blocked-websites"] });
    },
    onSettled: () => onBusyChange?.(false),
  });
  const error = touched ? validateDomainInput(domain) : null;
  function submit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (!validateDomainInput(domain) && !save.isPending) save.mutate({ domain: domain.trim() });
  }
  return (
    <section aria-labelledby="focus-sites-title" className="border-t border-border pt-6">
      <div className="flex items-center justify-between gap-3">
        <h2 id="focus-sites-title" className="text-sm font-semibold">Blocked websites</h2>
        {sites.isSuccess && <span className="text-xs text-muted">{sites.data.filter((site) => site.enabled).length} enabled</span>}
      </div>
      <form onSubmit={submit} noValidate className="mt-3 flex gap-2">
        <Input aria-label="Website domain or URL" placeholder="Add a domain, e.g. youtube.com" value={domain}
          className="min-w-0 flex-1" maxLength={2048} autoCapitalize="none" spellCheck={false}
          aria-invalid={Boolean(error)} aria-describedby={error ? "focus-domain-error" : undefined}
          onBlur={() => { if (domain.trim()) setTouched(true); }}
          onChange={(event) => { setDomain(event.target.value); if (save.error) save.reset(); }} />
        <Button type="submit" variant="secondary" size="icon" aria-label="Add site" title="Add site" disabled={save.isPending || sites.isPending || sites.isError}>
          {save.isPending ? <LoaderCircle size={17} className="animate-spin" /> : <Plus size={17} />}
        </Button>
      </form>
      {error && <p id="focus-domain-error" role="alert" className="mt-2 text-xs text-[#a84e3d]">{error}</p>}
      {save.error && <p role="alert" className="mt-2 text-xs text-[#a84e3d]">{save.error.message}</p>}
      {sites.isPending && <p className="mt-3 text-sm text-muted">Loading websites...</p>}
      {sites.isError && <div className="mt-3 text-sm"><p role="alert">Websites could not be loaded.</p><Button variant="ghost" onClick={() => sites.refetch()}>Retry websites</Button></div>}
      {sites.isSuccess && sites.data.length === 0 && <p className="mt-3 text-xs text-muted">No websites added. This session will be timer-only.</p>}
      <div className="mt-3 max-h-52 overflow-y-auto divide-y divide-border">
        {sites.data?.map((site) => (
          <div key={site.id} className="flex min-h-12 items-center gap-3 py-2">
            <Globe2 size={16} className="shrink-0 text-muted" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate text-sm" title={site.domain}>{site.domain}</span>
            <button type="button" role="switch" aria-checked={site.enabled} disabled={save.isPending}
              aria-label={`${site.enabled ? "Pause" : "Enable"} blocking for ${site.domain}`} title={site.enabled ? "Pause blocking" : "Enable blocking"}
              onClick={() => save.mutate({ id: site.id, enabled: !site.enabled })}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 ${site.enabled ? "bg-primary" : "bg-[#c7cec7]"}`}>
              <span className={`absolute left-1 top-1 size-4 rounded-full bg-white transition-transform ${site.enabled ? "translate-x-5" : ""}`} />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
