"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Globe2, LoaderCircle, Plus, Search, ShieldCheck, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/api/client";
import type { BlockedWebsite, FocusSession } from "@/lib/api/types";
import { requestExtensionSync } from "@/lib/extension-sync";
import { validateDomainInput } from "@/lib/validation/domain";

export function BlockedSitesScreen() {
  const queryClient = useQueryClient();
  const [domain, setDomain] = useState("");
  const [domainTouched, setDomainTouched] = useState(false);
  const [search, setSearch] = useState("");
  const [deletingSite, setDeletingSite] = useState<BlockedWebsite | null>(null);

  const sitesQuery = useQuery({
    queryKey: ["blocked-websites"],
    queryFn: () => apiRequest<BlockedWebsite[]>("/api/backend/blocked-websites"),
  });
  const activeQuery = useQuery({
    queryKey: ["sessions", "active"],
    queryFn: () => apiRequest<FocusSession | null>("/api/backend/sessions/active"),
    refetchInterval: 15_000,
  });

  const refreshSites = () => queryClient.invalidateQueries({ queryKey: ["blocked-websites"] });
  const addSite = useMutation({
    mutationFn: (value: string) => apiRequest<BlockedWebsite>("/api/backend/blocked-websites", {
      method: "POST",
      body: JSON.stringify({ domain: value }),
    }),
    onSuccess: async () => {
      setDomain("");
      setDomainTouched(false);
      requestExtensionSync();
      await refreshSites();
    },
  });
  const toggleSite = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      apiRequest<BlockedWebsite>(`/api/backend/blocked-websites/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled }),
      }),
    onSuccess: async () => {
      requestExtensionSync();
      await refreshSites();
    },
  });
  const deleteSite = useMutation({
    mutationFn: (id: string) => apiRequest<null>(`/api/backend/blocked-websites/${id}`, { method: "DELETE" }),
    onSuccess: async () => {
      requestExtensionSync();
      await refreshSites();
      setDeletingSite(null);
    },
  });

  const sites = sitesQuery.data ?? [];
  const enabledCount = sites.filter((site) => site.enabled).length;
  const visibleSites = sites.filter((site) => site.domain.includes(search.trim().toLowerCase()));
  const busy = addSite.isPending || toggleSite.isPending || deleteSite.isPending;
  const domainError = domainTouched ? validateDomainInput(domain) : null;

  function submitSite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDomainTouched(true);
    const value = domain.trim();
    if (!validateDomainInput(value) && !busy) addSite.mutate(value);
  }

  return (
    <div className="mx-auto max-w-[1120px] px-5 pb-10 pt-7 md:px-8 lg:px-10 lg:pt-9">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Blocked sites</h1>
          <p className="mt-1.5 text-sm text-muted">Manage the domains your extension blocks during focus sessions.</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted">
          <ShieldCheck size={17} className="text-primary" aria-hidden="true" />
          <span><strong className="font-semibold text-foreground">{enabledCount}</strong> enabled</span>
        </div>
      </div>

      <section className="mt-7 border-y border-border py-6" aria-labelledby="add-site-heading">
        <h2 id="add-site-heading" className="text-sm font-semibold">Add a website</h2>
        <form className="mt-3 flex flex-col gap-2 sm:flex-row" onSubmit={submitSite} noValidate>
          <Input
            className={`sm:max-w-lg ${domainError || addSite.error ? "border-[#b44f3d] focus:border-[#b44f3d] focus:ring-coral/15" : ""}`}
            aria-label="Website domain or URL"
            aria-invalid={Boolean(domainError || addSite.error)}
            aria-describedby={domainError || addSite.error ? "domain-error" : undefined}
            placeholder="example.com or https://example.com"
            value={domain}
            onBlur={() => setDomainTouched(true)}
            onChange={(event) => {
              setDomain(event.target.value);
              if (addSite.error) addSite.reset();
            }}
            autoCapitalize="none"
            spellCheck={false}
            maxLength={2048}
          />
          <Button type="submit" disabled={busy}>
            {addSite.isPending ? <LoaderCircle size={17} className="animate-spin" /> : <Plus size={17} />}
            Add site
          </Button>
        </form>
        {(domainError || addSite.error) && <p id="domain-error" className="mt-2 text-sm text-[#a84e3d]" role="alert">{domainError ?? addSite.error?.message}</p>}
      </section>

      <section className="pt-6" aria-labelledby="site-list-heading">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 id="site-list-heading" className="text-sm font-semibold">Your sites</h2>
            <p className="mt-0.5 text-xs text-muted">
              {activeQuery.data
                ? "Your enabled sites are blocked while this session is active."
                : activeQuery.isPending || activeQuery.error
                  ? "Enabled sites follow your focus session state."
                  : "Enabled sites will be blocked during your next focus session."}
            </p>
          </div>
          <div className="relative w-full sm:w-60">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
            <Input className="h-10 pl-9" aria-label="Search blocked sites" placeholder="Search sites" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
        </div>

        {toggleSite.error && <p className="mt-4 rounded-md bg-coral/10 px-3 py-2 text-sm text-[#a84e3d]" role="alert">{toggleSite.error.message}</p>}
        {sitesQuery.isPending && <div className="flex items-center gap-2 py-12 text-sm text-muted"><LoaderCircle size={18} className="animate-spin" />Loading sites</div>}
        {sitesQuery.error && (
          <div className="py-12">
            <p className="text-sm text-[#a84e3d]" role="alert">Sites could not be loaded. {sitesQuery.error.message}</p>
            <Button className="mt-3" variant="secondary" onClick={() => sitesQuery.refetch()}>Try again</Button>
          </div>
        )}
        {!sitesQuery.isPending && !sitesQuery.error && visibleSites.length === 0 && (
          <div className="mt-4 border-t border-border py-12 text-center">
            <Globe2 size={28} className="mx-auto text-muted" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold">{sites.length ? "No sites match your search" : "No blocked sites yet"}</p>
            <p className="mt-1 text-xs text-muted">{sites.length ? "Try another domain." : "Add a domain above to protect your next focus session."}</p>
          </div>
        )}
        {visibleSites.length > 0 && (
          <div className="mt-4 divide-y divide-border border-y border-border">
            {visibleSites.map((site) => (
              <div key={site.id} className="flex min-h-18 items-center gap-3 py-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-white text-primary"><Globe2 size={18} aria-hidden="true" /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold" title={site.domain}>{site.domain}</p>
                  <p className="text-xs text-muted">{site.enabled ? "Enabled" : "Paused"}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={site.enabled}
                  aria-label={`${site.enabled ? "Pause" : "Enable"} blocking for ${site.domain}`}
                  title={site.enabled ? "Pause blocking" : "Enable blocking"}
                  disabled={busy}
                  onClick={() => toggleSite.mutate({ id: site.id, enabled: !site.enabled })}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 ${site.enabled ? "bg-primary" : "bg-[#c7cec7]"}`}
                >
                  <span className={`absolute top-1 size-4 rounded-full bg-white shadow-sm transition-transform ${site.enabled ? "left-1 translate-x-5" : "left-1"}`} />
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 hover:bg-coral/10 hover:text-[#a84e3d]"
                  aria-label={`Delete ${site.domain}`}
                  title="Delete site"
                  disabled={busy}
                  onClick={() => { deleteSite.reset(); setDeletingSite(site); }}
                >
                  <Trash2 size={17} />
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      <Dialog open={Boolean(deletingSite)} onOpenChange={(open) => !open && setDeletingSite(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Remove blocked site?</DialogTitle>
            <DialogDescription>{deletingSite?.domain} will be removed from your list and will no longer be blocked by the extension.</DialogDescription>
          </DialogHeader>
          {deleteSite.error && <p className="mt-4 text-sm text-[#a84e3d]" role="alert">{deleteSite.error.message}</p>}
          <div className="mt-6 flex justify-end gap-2 border-t border-border pt-5">
            <DialogClose asChild><Button variant="secondary" disabled={deleteSite.isPending}>Cancel</Button></DialogClose>
            <Button className="bg-[#b44f3d] text-white shadow-none hover:bg-[#943e30]" disabled={deleteSite.isPending} onClick={() => deletingSite && deleteSite.mutate(deletingSite.id)}>
              {deleteSite.isPending && <LoaderCircle size={17} className="animate-spin" />}
              Remove site
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
