const PORTAL_POLICIES = {
  expensehub_demo: {
    pathPrefix: '/portal/expensehub',
    purposes: ['reimbursement_payment'],
  },
};

const SECRET_GRANTS = {
  BANK_ACCOUNT_1: {
    portalId: 'expensehub_demo',
    purposes: ['reimbursement_payment'],
    operations: ['fill'],
    maxUses: 1,
  },
  IFSC_1: {
    portalId: 'expensehub_demo',
    purposes: ['reimbursement_payment'],
    operations: ['fill'],
    maxUses: 1,
  },
};

const DEMO_VAULT = {
  BANK_ACCOUNT_1: '9876543210',
  IFSC_1: 'HDFC0001234',
};

chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get('contextflowVault');
  if (!existing.contextflowVault) {
    await chrome.storage.local.set({ contextflowVault: DEMO_VAULT, grantUsage: {} });
  }
});

function portalIdFromUrl(rawUrl) {
  if (!rawUrl) return null;
  const url = new URL(rawUrl);
  for (const [portalId, policy] of Object.entries(PORTAL_POLICIES)) {
    if (url.pathname.startsWith(policy.pathPrefix)) return portalId;
  }
  return null;
}

async function authorize({ secretRef, purpose, operation }, sender) {
  const portalId = portalIdFromUrl(sender?.url);
  const grant = SECRET_GRANTS[secretRef];
  if (!grant) return { authorized: false, reason: 'unknown_secret_ref', portalId };
  if (grant.portalId !== portalId) return { authorized: false, reason: 'portal_not_authorized', portalId };
  if (!grant.purposes.includes(purpose)) return { authorized: false, reason: 'purpose_not_authorized', portalId };
  if (!grant.operations.includes(operation)) return { authorized: false, reason: 'operation_not_authorized', portalId };

  const { grantUsage = {} } = await chrome.storage.local.get('grantUsage');
  const uses = Number(grantUsage[secretRef] || 0);
  if (uses >= grant.maxUses) return { authorized: false, reason: 'grant_exhausted', portalId };

  return { authorized: true, reason: 'grant_match', portalId };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'AUTHORIZE_SECRET') {
    authorize(msg, sender).then(sendResponse);
    return true;
  }

  if (msg.type === 'RESOLVE_SECRET_LOCAL') {
    (async () => {
      const decision = await authorize(msg, sender);
      if (!decision.authorized) return sendResponse(decision);

      const { contextflowVault = {}, grantUsage = {} } = await chrome.storage.local.get(['contextflowVault', 'grantUsage']);
      const value = contextflowVault[msg.secretRef];
      if (!value) return sendResponse({ authorized: false, reason: 'secret_missing', portalId: decision.portalId });

      grantUsage[msg.secretRef] = Number(grantUsage[msg.secretRef] || 0) + 1;
      await chrome.storage.local.set({ grantUsage });

      // This value is returned only across the browser extension's local message channel.
      // It is never sent to the backend, Strands, or Mission Control.
      sendResponse({ authorized: true, secretRef: msg.secretRef, value, portalId: decision.portalId });
    })();
    return true;
  }
});
