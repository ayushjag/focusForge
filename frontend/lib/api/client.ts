export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  message?: string;
};

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const payload = (await response.json().catch(() => null)) as
    | ApiEnvelope<T>
    | { message?: string; error?: { message?: string } }
    | null;

  if (!response.ok) {
    const nestedMessage =
      payload && "error" in payload ? payload.error?.message : undefined;
    throw new ApiError(
      nestedMessage ??
        payload?.message ??
        "Something went wrong. Please try again.",
      response.status,
    );
  }

  return (payload as ApiEnvelope<T>).data;
}
