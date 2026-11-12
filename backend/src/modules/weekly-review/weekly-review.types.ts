export type WeeklyReviewQuery = { weekStart?: string };

export type WeeklyPlanBody = {
  weekStart: string;
  priorities: string[];
};

export type WeeklySessionFact = {
  status: string;
  actualStart: Date;
  actualEnd: Date | null;
};

export type WeeklyTaskFact = {
  status: string;
  completedAt: Date | null;
};

export type WeeklyTargetFact = {
  effectiveDate: string;
  targetMinutes: number;
};
