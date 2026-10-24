export type CreateBlockedWebsiteBody = {
  domain: string;
};

export type UpdateBlockedWebsiteBody = {
  enabled: boolean;
};

export type BlockedWebsiteParams = {
  id: string;
};
