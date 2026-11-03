CREATE TABLE "DailyGoalTarget" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "effectiveDate" TEXT NOT NULL,
    "targetMinutes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyGoalTarget_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "DailyGoalTarget_targetMinutes_check" CHECK ("targetMinutes" BETWEEN 1 AND 480)
);

CREATE UNIQUE INDEX "DailyGoalTarget_userId_effectiveDate_key" ON "DailyGoalTarget"("userId", "effectiveDate");

ALTER TABLE "DailyGoalTarget" ADD CONSTRAINT "DailyGoalTarget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "FocusSession_userId_status_actualEnd_idx" ON "FocusSession"("userId", "status", "actualEnd");
