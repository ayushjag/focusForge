-- Prisma does not currently express partial unique indexes in the schema.
-- This keeps one active focus session per user even under concurrent requests.
CREATE UNIQUE INDEX "FocusSession_one_active_per_user"
ON "FocusSession" ("userId")
WHERE "status" = 'ACTIVE';
