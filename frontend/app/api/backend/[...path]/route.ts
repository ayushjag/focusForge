import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE, backendUrl } from "@/lib/server/backend";

const allowedRoots = new Set(["tasks", "sessions", "blocked-websites", "extension", "analytics"]);

async function proxyRequest(
  request: Request,
  context: RouteContext<"/api/backend/[...path]">,
) {
  const { path } = await context.params;
  const root = path[0];
  // Reject encoded separators and dot segments before URL resolution can normalize them.
  const safePath = path.every(
    (segment) => /^[A-Za-z0-9._~-]+$/.test(segment) && segment !== "." && segment !== "..",
  );
  if (!root || !allowedRoots.has(root) || !safePath) {
    return NextResponse.json(
      { success: false, message: "API route not allowed" },
      { status: 404 },
    );
  }

  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) {
    return NextResponse.json(
      { success: false, message: "Authentication required" },
      { status: 401 },
    );
  }

  const incomingUrl = new URL(request.url);
  const targetUrl = new URL(`/api/${path.join("/")}`, backendUrl);
  targetUrl.search = incomingUrl.search;

  try {
    const requestBody =
      request.method === "GET" || request.method === "HEAD"
        ? undefined
        : await request.arrayBuffer();
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    };

    if (requestBody?.byteLength) {
      headers["Content-Type"] =
        request.headers.get("Content-Type") ?? "application/json";
    }

    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: requestBody?.byteLength ? requestBody : undefined,
      cache: "no-store",
    });
    const result = new NextResponse(await response.text(), {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("Content-Type") ?? "application/json",
      },
    });
    if (response.status === 401) result.cookies.delete(ACCESS_TOKEN_COOKIE);
    return result;
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "FocusForge API is unavailable. Start the backend and try again.",
      },
      { status: 503 },
    );
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
