const email = { type: "string", format: "email", maxLength: 320 };
const password = { type: "string", minLength: 8, maxLength: 128 };

export const registerSchema = {
  type: "object",
  required: ["email", "password"],
  additionalProperties: false,
  properties: {
    email,
    password,
    timezone: { type: "string", minLength: 1, maxLength: 100 },
  },
} as const;

export const loginSchema = {
  type: "object",
  required: ["email", "password"],
  additionalProperties: false,
  properties: { email, password },
} as const;
