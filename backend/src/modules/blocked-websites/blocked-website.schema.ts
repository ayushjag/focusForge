export const createBlockedWebsiteSchema = {
  type: "object",
  required: ["domain"],
  additionalProperties: false,
  properties: {
    domain: { type: "string", minLength: 1, maxLength: 2048 },
  },
} as const;

export const updateBlockedWebsiteSchema = {
  type: "object",
  required: ["enabled"],
  additionalProperties: false,
  properties: {
    enabled: { type: "boolean" },
  },
} as const;

export const blockedWebsiteIdParamsSchema = {
  type: "object",
  required: ["id"],
  additionalProperties: false,
  properties: {
    id: { type: "string", minLength: 1 },
  },
} as const;
