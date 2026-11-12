export const weeklyReviewQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: { weekStart: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" } },
} as const;

export const weeklyPlanBodySchema = {
  type: "object",
  required: ["weekStart", "priorities"],
  additionalProperties: false,
  properties: {
    weekStart: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
    priorities: {
      type: "array",
      maxItems: 3,
      items: { type: "string", minLength: 1, maxLength: 120 },
    },
  },
} as const;
