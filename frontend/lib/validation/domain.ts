export function validateDomainInput(input: string): string | null {
  const value = input.trim().toLowerCase();
  if (!value) return "Enter a website domain or URL.";

  let url: URL;
  try {
    url = new URL(value.includes("://") ? value : `https://${value}`);
  } catch {
    return "Enter a valid domain or URL, such as youtube.com.";
  }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.port) {
    return "Use a website domain or HTTP(S) URL without a port or login.";
  }
  const hostname = url.hostname.replace(/^www\./, "").replace(/\.$/, "");
  const labels = hostname.split(".");
  if (
    hostname.length > 253 || labels.length < 2 ||
    /^\d+\.\d+\.\d+\.\d+$/.test(hostname) ||
    labels.some((label) => label.length > 63 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label))
  ) return "Enter a public domain, such as youtube.com.";
  return null;
}
