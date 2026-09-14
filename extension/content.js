function labelFor(el) {
  return (
    el.labels?.[0]?.innerText ||
    el.getAttribute('aria-label') ||
    el.getAttribute('placeholder') ||
    el.innerText ||
    ''
  ).trim();
}

function visible(el) {
  const rect = el.getBoundingClientRect();
  const style = getComputedStyle(el);
  return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
}

function actionableElements() {
  return [...document.querySelectorAll('input,select,textarea,button,a')];
}

function semanticMap() {
  return actionableElements().map((el, index) => ({
    elementId: `el_${index + 1}`,
    role: el.getAttribute('role') || el.tagName.toLowerCase(),
    label: labelFor(el),
    type: el.getAttribute('type') || null,
    required: Boolean(el.required),
    visible: visible(el),
    enabled: !el.disabled,
    sensitive: Boolean(el.getAttribute('data-secret-ref')),
    secretRef: el.getAttribute('data-secret-ref') || null,
  }));
}

async function snapshotHash() {
  const representation = JSON.stringify(semanticMap());
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(representation));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function fillSecret({ elementId, secretRef, purpose, expectedSnapshot }) {
  const currentSnapshot = await snapshotHash();
  if (expectedSnapshot && currentSnapshot !== expectedSnapshot) {
    return { ok: false, reason: 'snapshot_changed', expectedSnapshot, currentSnapshot };
  }

  const elements = actionableElements();
  const index = Number(elementId.replace('el_', '')) - 1;
  const target = elements[index];
  if (!target || !(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) {
    return { ok: false, reason: 'invalid_target' };
  }
  if (target.getAttribute('data-secret-ref') !== secretRef) {
    return { ok: false, reason: 'secret_field_mismatch' };
  }

  const response = await chrome.runtime.sendMessage({
    type: 'RESOLVE_SECRET_LOCAL',
    secretRef,
    purpose,
    operation: 'fill',
    targetOrigin: location.origin,
  });
  if (!response?.authorized) return { ok: false, ...response };

  target.value = response.value;
  target.dispatchEvent(new Event('input', { bubbles: true }));
  target.dispatchEvent(new Event('change', { bubbles: true }));
  return { ok: true, secretRef, portalId: response.portalId, rawValueReturnedToBackend: false };
}

async function fillBySecretRef(secretRef, purpose) {
  const elements = actionableElements();
  const index = elements.findIndex((el) => el.getAttribute('data-secret-ref') === secretRef);
  if (index < 0) return { ok: false, reason: 'secret_field_not_found', secretRef };
  const expectedSnapshot = await snapshotHash();
  return fillSecret({ elementId: `el_${index + 1}`, secretRef, purpose, expectedSnapshot });
}

function respond(requestId, type, payload) {
  window.postMessage(
    { source: 'contextflow-extension', requestId, type, payload },
    location.origin,
  );
}

window.addEventListener('message', async (event) => {
  if (event.source !== window || event.origin !== location.origin) return;
  const message = event.data;
  if (!message || message.source !== 'contextflow-page') return;

  try {
    if (message.type === 'PING') {
      respond(message.requestId, 'PONG', { ready: true });
      return;
    }

    if (message.type === 'GET_SEMANTIC_SNAPSHOT') {
      respond(message.requestId, 'SEMANTIC_SNAPSHOT', {
        url: location.href,
        origin: location.origin,
        snapshotHash: await snapshotHash(),
        elements: semanticMap(),
      });
      return;
    }

    if (message.type === 'FILL_SECRET') {
      const result = await fillBySecretRef(message.secretRef, message.purpose);
      respond(message.requestId, 'FILL_SECRET_RESULT', result);
      return;
    }

    if (message.type === 'REQUEST_DISCLOSURE') {
      const decision = await chrome.runtime.sendMessage({
        type: 'AUTHORIZE_SECRET',
        secretRef: message.secretRef,
        purpose: message.purpose,
        operation: message.operation || 'fill',
        targetOrigin: message.targetOrigin,
      });
      respond(message.requestId, 'DISCLOSURE_DECISION', decision);
      return;
    }

    if (message.type === 'RESET_DEMO_GRANTS') {
      const result = await chrome.runtime.sendMessage({ type: 'RESET_DEMO_GRANTS' });
      respond(message.requestId, 'RESET_DEMO_GRANTS_RESULT', result);
    }
  } catch (error) {
    respond(message.requestId, 'ERROR', { message: error instanceof Error ? error.message : String(error) });
  }
});

window.postMessage({ source: 'contextflow-extension', type: 'READY', payload: { ready: true } }, location.origin);
console.info('[ContextFlow] privacy kernel ready; raw vault values remain extension-local');
