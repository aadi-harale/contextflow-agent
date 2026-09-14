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

function semanticMap() {
  return [...document.querySelectorAll('input,select,textarea,button,a')].map((el, index) => ({
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

  const elements = [...document.querySelectorAll('input,select,textarea,button,a')];
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
  });
  if (!response?.authorized) return { ok: false, ...response };

  target.value = response.value;
  target.dispatchEvent(new Event('input', { bubbles: true }));
  target.dispatchEvent(new Event('change', { bubbles: true }));
  return { ok: true, secretRef, portalId: response.portalId, rawValueReturnedToBackend: false };
}

window.__CONTEXTFLOW__ = {
  getSemanticSnapshot: async () => ({
    url: location.href,
    snapshotHash: await snapshotHash(),
    elements: semanticMap(),
  }),
  fillSecret,
};

window.dispatchEvent(new CustomEvent('contextflow:ready'));
console.info('[ContextFlow] privacy kernel ready; raw vault values remain extension-local');
