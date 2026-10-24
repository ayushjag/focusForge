export const analyticsQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    timezone: { type: "string", minLength: 1, maxLength: 64 },
  },
} as const;
