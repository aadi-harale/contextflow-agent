const PORTAL_POLICIES = {
  expensehub_demo: {
    pathPrefix: '/portal/expensehub',
    allowedOrigins: ['http://localhost:3000', 'https://contextflow-agent.vercel.app'],
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

function portalContext(rawUrl) {
  if (!rawUrl) return { portalId: null, origin: null };
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return { portalId: null, origin: null };
  }

  for (const [portalId, policy] of Object.entries(PORTAL_POLICIES)) {
    const originAllowed = policy.allowedOrigins.includes(url.origin);
    const pathAllowed = url.pathname.startsWith(policy.pathPrefix);
    if (originAllowed && pathAllowed) return { portalId, origin: url.origin };
  }
  return { portalId: null, origin: url.origin };
}

async function authorize({ secretRef, purpose, operation, targetOrigin }, sender) {
  const { portalId, origin: senderOrigin } = portalContext(sender?.url);
  const grant = SECRET_GRANTS[secretRef];

  if (!grant) return { authorized: false, reason: 'unknown_secret_ref', portalId, senderOrigin };
  if (!portalId || grant.portalId !== portalId) {
    return { authorized: false, reason: 'portal_not_authorized', portalId, senderOrigin };
  }
  if (targetOrigin !== senderOrigin) {
    return { authorized: false, reason: 'target_origin_not_authorized', portalId, senderOrigin, targetOrigin };
  }
  if (!grant.purposes.includes(purpose)) {
    return { authorized: false, reason: 'purpose_not_authorized', portalId, senderOrigin };
  }
  if (!grant.operations.includes(operation)) {
    return { authorized: false, reason: 'operation_not_authorized', portalId, senderOrigin };
  }

  const { grantUsage = {} } = await chrome.storage.local.get('grantUsage');
  const uses = Number(grantUsage[secretRef] || 0);
  if (uses >= grant.maxUses) {
    return { authorized: false, reason: 'grant_exhausted', portalId, senderOrigin };
  }

  return { authorized: true, reason: 'grant_match', portalId, senderOrigin, targetOrigin };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'RESET_DEMO_GRANTS') {
    chrome.storage.local.set({ grantUsage: {} }).then(() => sendResponse({ ok: true }));
    return true;
  }

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
      if (!value) {
        return sendResponse({ authorized: false, reason: 'secret_missing', portalId: decision.portalId });
      }

      grantUsage[msg.secretRef] = Number(grantUsage[msg.secretRef] || 0) + 1;
      await chrome.storage.local.set({ grantUsage });

      // The raw value only crosses the extension's private message channel and is
      // written directly into the approved DOM field by the content script.
      sendResponse({
        authorized: true,
        secretRef: msg.secretRef,
        value,
        portalId: decision.portalId,
        targetOrigin: decision.targetOrigin,
      });
    })();
    return true;
  }
});
