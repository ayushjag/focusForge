-- Add timing columns as nullable so existing session history can be preserved.
ALTER TABLE "FocusSession"
ADD COLUMN "plannedDurationMinutes" INTEGER,
ADD COLUMN "plannedEnd" TIMESTAMP(3);

-- Completed sessions use their recorded duration. Legacy active sessions receive
-- a 25-minute plan and will expire on the next session-state request if overdue.
UPDATE "FocusSession"
SET
  "plannedEnd" = COALESCE("actualEnd", "actualStart" + INTERVAL '25 minutes'),
  "plannedDurationMinutes" = GREATEST(
    1,
    CEIL(
      EXTRACT(
        EPOCH FROM (COALESCE("actualEnd", "actualStart" + INTERVAL '25 minutes') - "actualStart")
      ) / 60
    )::INTEGER
  );

ALTER TABLE "FocusSession"
ALTER COLUMN "plannedDurationMinutes" SET NOT NULL,
ALTER COLUMN "plannedEnd" SET NOT NULL;

CREATE INDEX "FocusSession_status_plannedEnd_idx"
ON "FocusSession"("status", "plannedEnd");
