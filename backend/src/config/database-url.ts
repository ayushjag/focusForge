export function withNeonConnectionTimeout(value: string | undefined): string | undefined {
  if (!value) return value;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return value;
  }

  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !url.hostname.endsWith(".neon.tech") ||
    url.searchParams.has("connect_timeout")
  ) {
    return value;
  }

  url.searchParams.set("connect_timeout", "15");
  return url.toString();
}
