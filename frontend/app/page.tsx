import { redirect } from "next/navigation";

// Redirect-only routes intentionally have no static UI shell to validate.
export const instant = false;

export default function Home() {
  redirect("/login");
}
