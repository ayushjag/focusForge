export type DailyGoalBody = { targetMinutes: number };
export type DailyGoalQuery = { days?: number };

export type DailyGoalTargetFact = {
  effectiveDate: string;
  targetMinutes: number;
};

export type DailyGoalSessionFact = {
  status: string;
  actualStart: Date;
  actualEnd: Date | null;
};
