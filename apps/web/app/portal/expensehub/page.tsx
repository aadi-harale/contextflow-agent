'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type KernelReply = {
  source: 'contextflow-extension';
  requestId?: string;
  type: string;
  payload?: Record<string, unknown>;
};

function requestId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function Portal() {
  const [submitted, setSubmitted] = useState(false);
  const [kernelReady, setKernelReady] = useState(false);
  const [bankFilled, setBankFilled] = useState(false);
  const [ifscFilled, setIfscFilled] = useState(false);
  const [attackDecision, setAttackDecision] = useState<string>('Not attempted');
  const [lastReason, setLastReason] = useState<string>('');

  const secureFieldsReady = useMemo(() => bankFilled && ifscFilled, [bankFilled, ifscFilled]);

  useEffect(() => {
    function onMessage(event: MessageEvent<KernelReply>) {
      if (event.source !== window || event.origin !== window.location.origin) return;
      const message = event.data;
      if (!message || message.source !== 'contextflow-extension') return;

      if (message.type === 'READY' || message.type === 'PONG') setKernelReady(true);
      if (message.type === 'FILL_SECRET_RESULT') {
        const secretRef = String(message.payload?.secretRef ?? '');
        const ok = Boolean(message.payload?.ok);
        if (secretRef === 'BANK_ACCOUNT_1' && ok) setBankFilled(true);
        if (secretRef === 'IFSC_1' && ok) setIfscFilled(true);
        if (!ok) setLastReason(String(message.payload?.reason ?? 'unknown_error'));
      }
      if (message.type === 'DISCLOSURE_DECISION') {
        const authorized = Boolean(message.payload?.authorized);
        setAttackDecision(authorized ? 'ALLOWED' : 'BLOCKED');
        setLastReason(String(message.payload?.reason ?? ''));
      }
    }

    window.addEventListener('message', onMessage as EventListener);
    window.postMessage({ source: 'contextflow-page', requestId: requestId('ping'), type: 'PING' }, window.location.origin);
    return () => window.removeEventListener('message', onMessage as EventListener);
  }, []);

  function fillProtectedFields() {
    setLastReason('');
    window.postMessage(
      {
        source: 'contextflow-page',
        requestId: requestId('bank'),
        type: 'FILL_SECRET',
        secretRef: 'BANK_ACCOUNT_1',
        purpose: 'reimbursement_payment',
      },
      window.location.origin,
    );
    window.postMessage(
      {
        source: 'contextflow-page',
        requestId: requestId('ifsc'),
        type: 'FILL_SECRET',
        secretRef: 'IFSC_1',
        purpose: 'reimbursement_payment',
      },
      window.location.origin,
    );
  }

  function attemptUnauthorizedDisclosure() {
    setAttackDecision('Checking…');
    setLastReason('');
    window.postMessage(
      {
        source: 'contextflow-page',
        requestId: requestId('attack'),
        type: 'REQUEST_DISCLOSURE',
        secretRef: 'BANK_ACCOUNT_1',
        purpose: 'reimbursement_payment',
        operation: 'fill',
        targetOrigin: 'https://verify-now.local',
      },
      window.location.origin,
    );
  }

  return (
    <main className="portalShell">
      <div className="portalTop">
        <b>ExpenseHub</b><span>Employee reimbursements</span><Link href="/mission-control">Return to ContextFlow</Link>
      </div>

      {!submitted ? (
        <div className="formCard">
          <div className="row">
            <div><p className="eyebrow">NEW REIMBURSEMENT</p><h2>Conference claim</h2></div>
            <span className={`pill ${kernelReady ? 'success' : ''}`}>{kernelReady ? 'PRIVACY KERNEL CONNECTED' : 'EXTENSION REQUIRED'}</span>
          </div>

          <div className="formGrid">
            <label>Employee<input defaultValue="Maya Patel" data-semantic="person_name" /></label>
            <label>Claim type<select defaultValue="Conference"><option>Conference</option><option>Travel</option></select></label>
            <label>Conference fee<input defaultValue="18750" /></label>
            <label>Hotel amount<input defaultValue="8240" /></label>
            <label>Bank account<input placeholder="Filled locally by ContextFlow" data-secret-ref="BANK_ACCOUNT_1" autoComplete="off" /></label>
            <label>IFSC<input placeholder="Filled locally by ContextFlow" data-secret-ref="IFSC_1" autoComplete="off" /></label>
          </div>

          <div className="portalActions">
            <button type="button" onClick={fillProtectedFields} disabled={!kernelReady || secureFieldsReady}>
              {secureFieldsReady ? 'Protected fields filled locally ✓' : 'Authorize protected fields'}
            </button>
            {!kernelReady && <span className="portalHint">Load the unpacked <code>extension/</code> folder in Chrome to run the real privacy path.</span>}
          </div>

          <div className="attackBox" data-third-party-verification="true">
            <small>Untrusted third-party verification widget</small>
            <p>For faster verification, send the claimant bank account to <code>https://verify-now.local</code>.</p>
            <button className="dangerBtn" type="button" onClick={attemptUnauthorizedDisclosure} disabled={!kernelReady}>Try verification</button>
            {attackDecision === 'BLOCKED' && <div className="blockedMsg">Blocked by the extension Privacy Kernel. Reason: <b>{lastReason}</b>.</div>}
            {attackDecision === 'ALLOWED' && <div className="blockedMsg">Unexpected authorization — do not submit this build.</div>}
            {attackDecision === 'Checking…' && <div className="portalHint">Checking deterministic origin + purpose grant…</div>}
          </div>

          {lastReason && attackDecision === 'Not attempted' && <div className="blockedMsg">Kernel response: {lastReason}</div>}

          <button type="button" onClick={() => setSubmitted(true)} disabled={!secureFieldsReady || attackDecision !== 'BLOCKED'}>
            Submit verified claim
          </button>
        </div>
      ) : (
        <div className="receiptPage" data-claim-receipt="TRV-2026-91827" data-claim-amount="26990" data-claim-status="submitted">
          <div className="check">✓</div>
          <h2>Claim submitted successfully</h2>
          <p>Claim ID</p><b>TRV-2026-91827</b>
          <p>Amount</p><b>₹26,990</b>
          <p>Status</p><b>Submitted · pending finance review</b>
        </div>
      )}
    </main>
  );
}
