export type RegisterBody = {
  email: string;
  password: string;
  timezone?: string;
};

export type LoginBody = {
  email: string;
  password: string;
};
