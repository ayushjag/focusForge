import type { ReactNode } from "react";
import { Logo } from "@/components/ui/logo";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[minmax(420px,0.84fr)_1.16fr]">
      <section className="flex min-h-screen flex-col bg-white px-6 py-6 sm:px-10 lg:px-14">
        <Logo />
        <div className="mx-auto flex w-full max-w-[430px] flex-1 items-center py-12">
          {children}
        </div>
        <p className="text-xs text-muted">FocusForge workspace</p>
      </section>
      <section className="relative hidden overflow-hidden bg-[#1b2a21] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-x-0 bottom-0 h-[42%] bg-[#213c2d]" />
        <div className="relative max-w-xl">
          <span className="inline-flex rounded-md bg-focus px-3 py-1.5 text-xs font-bold uppercase text-foreground">
            Focus with intention
          </span>
          <h2 className="mt-6 max-w-lg text-4xl font-bold leading-tight">
            Turn planned work into protected time.
          </h2>
          <p className="mt-4 max-w-md text-base leading-7 text-[#bdc9c0]">
            One place for tasks, timed focus sessions, and the websites that should stay out of your way.
          </p>
        </div>
        <div className="relative grid max-w-xl grid-cols-3 gap-3">
          {[
            ["01", "Choose the work"],
            ["02", "Start the timer"],
            ["03", "Protect your focus"],
          ].map(([number, label]) => (
            <div className="border-t border-white/20 pt-4" key={number}>
              <p className="text-xs font-bold text-focus">{number}</p>
              <p className="mt-2 text-sm text-[#e3e9e4]">{label}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
