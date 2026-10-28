import { Download, ExternalLink, Puzzle } from "lucide-react";
import Link from "next/link";
import { ExtensionStatus } from "@/components/focus/extension-status";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { SetupAccountActions } from "@/components/setup/setup-account-actions";
import release from "@/public/downloads/extension-release.json";

const steps = [
  {
    title: "Download and extract",
    detail: "Download the ZIP above and extract it. Keep the extracted folder; Chrome loads the folder containing manifest.json.",
  },
  {
    title: "Add to Chrome",
    detail: "Open chrome://extensions in desktop Chrome, turn on Developer mode, click Load unpacked, and choose the extracted folder.",
  },
  {
    title: "Sign in to both",
    detail: "Sign in on this website, then click the FocusForge icon in Chrome and sign in with the same account.",
  },
  {
    title: "Check and focus",
    detail: "Refresh this tab after installing. Check the connection below, then start a focus session.",
  },
];

export default function SetupPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex h-16 max-w-[1100px] items-center justify-between gap-4 px-5 md:px-8">
          <Link href="/dashboard" className="flex items-center gap-2.5 font-semibold" aria-label="FocusForge dashboard">
            <Logo compact />
            <span>FocusForge</span>
          </Link>
          <SetupAccountActions header />
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] px-5 pb-16 pt-9 md:px-8 md:pt-12">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted">
          <Puzzle size={16} className="text-primary" aria-hidden="true" />
          <span>Chrome extension</span>
          <span aria-hidden="true">/</span>
          <span>Version {release.version}</span>
        </div>
        <h1 className="mt-3 text-3xl font-semibold">Set up website blocking</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">Install FocusForge in desktop Chrome, connect your account, and keep distractions out of your focus sessions.</p>

        <div className="mt-9 grid gap-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.85fr)] lg:gap-14">
          <div className="min-w-0">
            <Button asChild className="w-full sm:w-auto">
              <a href={`/downloads/${release.file}`} download={`FocusForge-${release.version}.zip`}>
                <Download size={17} />Download extension
              </a>
            </Button>
            <p className="mt-2 text-xs text-muted">For desktop Chrome. Extract the ZIP before installing.</p>

            <ol className="mt-9 divide-y divide-border border-y border-border">
              {steps.map((step, index) => (
                <li key={step.title} className="flex gap-4 py-5">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-soft text-xs font-semibold" aria-hidden="true">{index + 1}</span>
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold">{step.title}</h2>
                    <p className="mt-1 text-sm leading-6 text-muted">{step.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
            <a className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-hover"
              href="https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked"
              target="_blank" rel="noopener noreferrer">
              Chrome installation guide <ExternalLink size={13} aria-hidden="true" />
            </a>
          </div>

          <aside className="min-w-0 border-t border-border pt-7 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0" aria-labelledby="connection-heading">
            <h2 id="connection-heading" className="text-lg font-semibold">Connection</h2>
            <p className="mt-1 text-sm text-muted">Use the same account on the website and in the extension.</p>
            <div className="mt-5"><ExtensionStatus showSetupLink={false} /></div>
            <div className="mt-6"><SetupAccountActions /></div>
            <p className="mt-7 text-xs leading-5 text-muted">This ZIP is for early testing. Chrome does not install ZIPs automatically; choose the extracted folder in Developer mode.</p>
          </aside>
        </div>
      </main>
    </div>
  );
}
