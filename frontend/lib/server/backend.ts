import "server-only";

export const ACCESS_TOKEN_COOKIE = "focusforge_access_token";
export const backendUrl = process.env.FOCUSFORGE_API_URL ?? "http://127.0.0.1:5000";

export async function fetchBackend(path: string, init?: RequestInit) {
  try {
    return await fetch(`${backendUrl}${path}`, {
      ...init,
      cache: "no-store",
    });
  } catch {
    return Response.json(
      {
        success: false,
        message: "FocusForge API is unavailable. Start the backend and try again.",
      },
      { status: 503 },
    );
  }
}
