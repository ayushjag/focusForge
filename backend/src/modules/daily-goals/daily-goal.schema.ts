export const dailyGoalBodySchema = {
  type: "object",
  required: ["targetMinutes"],
  additionalProperties: false,
  properties: { targetMinutes: { type: "integer", minimum: 1, maximum: 480 } },
} as const;

export const dailyGoalQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: { days: { type: "integer", minimum: 1, maximum: 90 } },
} as const;
