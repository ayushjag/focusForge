import { handleAuth } from "@/lib/server/auth-handler";

export async function POST(request: Request) {
  return handleAuth(request, "register");
}
