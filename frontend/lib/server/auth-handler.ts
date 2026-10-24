import "server-only";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE, fetchBackend } from "./backend";

type AuthPayload = {
  success: boolean;
  data?: { user: unknown; accessToken: string };
  message?: string;
};

export async function handleAuth(request: Request, action: "login" | "register") {
  const response = await fetchBackend(`/api/auth/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: await request.text(),
  });
  const payload = (await response.json()) as AuthPayload;

  if (!response.ok || !payload.data) {
    return NextResponse.json(payload, { status: response.status });
  }

  const cookieStore = await cookies();
  cookieStore.set(ACCESS_TOKEN_COOKIE, payload.data.accessToken, {
    httpOnly: true,
    maxAge: 60 * 60,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return NextResponse.json({ success: true, data: payload.data.user });
}
