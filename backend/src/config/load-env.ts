import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const useDirectUrlFallback = () => {
  if (!process.env.DATABASE_URL_UNPOOLED && process.env.DATABASE_URL) {
    process.env.DATABASE_URL_UNPOOLED = process.env.DATABASE_URL;
  }
};

// Keep an explicitly supplied database URL paired with its own migration URL.
useDirectUrlFallback();

// Neon writes to the workspace root; the backend .env remains a local fallback.
for (const relativePath of ["../../../.env.local", "../../../.env", "../../.env"]) {
  const path = fileURLToPath(new URL(relativePath, import.meta.url));
  if (existsSync(path)) process.loadEnvFile(path);
  useDirectUrlFallback();
}
