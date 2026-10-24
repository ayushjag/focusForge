const RULE_ID_START = 1000;

const createRedirectRule = (domain, index) => ({
  id: RULE_ID_START + index,
  priority: 1,
  action: {
    type: "redirect",
    redirect: { extensionPath: "/blocked/blocked.html" },
  },
  condition: {
    urlFilter: `||${domain}^`,
    resourceTypes: ["main_frame"],
  },
});

export const applyBlockingRules = async (domains) => {
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const uniqueDomains = [...new Set(domains)].sort();

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existingRules.map((rule) => rule.id),
    addRules: uniqueDomains.map(createRedirectRule),
  });
};

export const redirectOpenBlockedTabs = async (domains) => {
  if (domains.length === 0) return;

  const patterns = [...new Set(domains)].map((domain) => `*://*.${domain}/*`);
  const tabs = await chrome.tabs.query({ url: patterns });
  const blockedPage = chrome.runtime.getURL("blocked/blocked.html");

  await Promise.allSettled(
    tabs.filter((tab) => tab.id !== undefined).map((tab) =>
      chrome.tabs.update(tab.id, { url: blockedPage }),
    ),
  );
};

export const clearBlockingRules = async () => {
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();

  if (existingRules.length > 0) {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: existingRules.map((rule) => rule.id),
    });
  }
};
