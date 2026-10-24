import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE } from "@/lib/server/backend";

export async function POST() {
  (await cookies()).delete(ACCESS_TOKEN_COOKIE);
  return NextResponse.json({ success: true, data: null });
}
