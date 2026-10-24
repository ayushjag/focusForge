import "./load-env.js";

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret || jwtSecret.length < 32) {
  throw new Error("JWT_SECRET must be set to a value with at least 32 characters");
}

export const env = {
  jwtSecret,
};
