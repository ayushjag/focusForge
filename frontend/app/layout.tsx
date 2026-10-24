import type { Metadata } from "next";
import localFont from "next/font/local";
import { Providers } from "./providers";
import "./globals.css";

const workspaceFont = localFont({
  src: "../node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2",
  variable: "--font-workspace",
  weight: "200 800",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FocusForge",
  description: "Plan focused work and keep distractions out of the way.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={workspaceFont.variable}>
      <body className={workspaceFont.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
