import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE, fetchBackend } from "@/lib/server/backend";

export async function GET() {
  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) {
    return NextResponse.json(
      { success: false, message: "Authentication required" },
      { status: 401 },
    );
  }

  const response = await fetchBackend("/api/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const result = new NextResponse(await response.text(), {
    status: response.status,
    headers: { "Content-Type": "application/json" },
  });
  if (response.status === 401) result.cookies.delete(ACCESS_TOKEN_COOKIE);
  return result;
}
