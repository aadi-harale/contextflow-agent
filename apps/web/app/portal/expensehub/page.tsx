'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { appendRuntimeEvent, makeClientEvent } from '@/lib/client-events';

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
  const [filling, setFilling] = useState(false);
  const verifiedRef = useRef(false);

  const secureFieldsReady = useMemo(() => bankFilled && ifscFilled, [bankFilled, ifscFilled]);

  function emit(
    type: Parameters<typeof makeClientEvent>[0],
    actor: Parameters<typeof makeClientEvent>[1],
    title: string,
    detail: string,
    data: Record<string, string | number | boolean> = {},
  ) {
    appendRuntimeEvent(makeClientEvent(type, actor, title, detail, data));
  }

  useEffect(() => {
    function onMessage(event: MessageEvent<KernelReply>) {
      if (event.source !== window || event.origin !== window.location.origin) return;
      const message = event.data;
      if (!message || message.source !== 'contextflow-extension') return;

      if (message.type === 'READY' || message.type === 'PONG') {
        setKernelReady(true);
        window.postMessage({ source: 'contextflow-page', requestId: requestId('reset'), type: 'RESET_DEMO_GRANTS' }, window.location.origin);
      }

      if (message.type === 'SEMANTIC_SNAPSHOT') {
        emit(
          'BROWSER_SNAPSHOT_READY',
          'browser_bridge',
          'ExpenseHub semantic snapshot captured',
          'The extension exposed field semantics and opaque secret references without exposing input values.',
          { sensitive_fields: 2, snapshot_hash: String(message.payload?.snapshotHash ?? '') },
        );

        window.postMessage({ source: 'contextflow-page', requestId: requestId('bank'), type: 'FILL_SECRET', secretRef: 'BANK_ACCOUNT_1', purpose: 'reimbursement_payment' }, window.location.origin);
        window.postMessage({ source: 'contextflow-page', requestId: requestId('ifsc'), type: 'FILL_SECRET', secretRef: 'IFSC_1', purpose: 'reimbursement_payment' }, window.location.origin);
      }

      if (message.type === 'FILL_SECRET_RESULT') {
        const secretRef = String(message.payload?.secretRef ?? '');
        const ok = Boolean(message.payload?.ok);
        if (secretRef === 'BANK_ACCOUNT_1' && ok) setBankFilled(true);
        if (secretRef === 'IFSC_1' && ok) setIfscFilled(true);
        if (!ok) {
          setLastReason(String(message.payload?.reason ?? 'unknown_error'));
          setFilling(false);
        } else {
          emit(
            'SECRET_DISCLOSURE_ALLOWED',
            'privacy_kernel',
            `${secretRef} resolved locally`,
            'The deterministic capability grant allowed a one-time local fill into the approved ExpenseHub origin.',
            { secret_ref: secretRef, destination: window.location.origin, raw_value_sent_to_backend: false },
          );
        }
      }

      if (message.type === 'DISCLOSURE_DECISION') {
        const authorized = Boolean(message.payload?.authorized);
        setAttackDecision(authorized ? 'ALLOWED' : 'BLOCKED');
        setLastReason(String(message.payload?.reason ?? ''));
        emit(
          authorized ? 'SECRET_DISCLOSURE_ALLOWED' : 'SECRET_DISCLOSURE_DENIED',
          'privacy_kernel',
          authorized ? 'Unexpected external disclosure authorized' : 'Unauthorized disclosure blocked',
          authorized
            ? 'The requested disclosure was authorized. This build should not be submitted.'
            : 'The untrusted verification widget requested BANK_ACCOUNT_1 for a destination outside the capability grant.',
          { secret_ref: 'BANK_ACCOUNT_1', destination: 'https://verify-now.local', reason: String(message.payload?.reason ?? '') },
        );
      }
    }

    window.addEventListener('message', onMessage as EventListener);
    window.postMessage({ source: 'contextflow-page', requestId: requestId('ping'), type: 'PING' }, window.location.origin);
    return () => window.removeEventListener('message', onMessage as EventListener);
  }, []);

  useEffect(() => {
    if (!secureFieldsReady) return;
    setFilling(false);
  }, [secureFieldsReady]);

  useEffect(() => {
    if (!submitted || verifiedRef.current) return;
    verifiedRef.current = true;
    const timer = window.setTimeout(() => {
      const receipt = document.querySelector<HTMLElement>('[data-claim-receipt]');
      const receiptId = receipt?.dataset.claimReceipt ?? '';
      const observedAmount = Number(receipt?.dataset.claimAmount ?? 0);
      const observedStatus = receipt?.dataset.claimStatus ?? '';
      const verified = receiptId === 'TRV-2026-91827' && observedAmount === 26990 && observedStatus === 'submitted';
      if (!verified) return;

      emit('SUBMISSION_VERIFIED', 'verifier', 'Portal outcome independently verified', 'The verifier read the rendered portal state and matched receipt, amount, and submitted status against the intended claim.', { receipt_id: receiptId, amount: observedAmount, verified: true });
      emit('RUN_COMPLETED', 'verifier', 'Verified complete', 'Only the verifier promoted this workflow to VERIFIED_COMPLETE.', { final_amount: observedAmount, raw_secrets_to_model: 0 });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [submitted]);

  function fillProtectedFields() {
    if (!kernelReady || filling || secureFieldsReady) return;
    setFilling(true);
    setLastReason('');
    window.postMessage({ source: 'contextflow-page', requestId: requestId('snapshot'), type: 'GET_SEMANTIC_SNAPSHOT' }, window.location.origin);
  }

  function attemptUnauthorizedDisclosure() {
    setAttackDecision('Checking…');
    setLastReason('');
    window.postMessage({
      source: 'contextflow-page',
      requestId: requestId('attack'),
      type: 'REQUEST_DISCLOSURE',
      secretRef: 'BANK_ACCOUNT_1',
      purpose: 'reimbursement_payment',
      operation: 'fill',
      targetOrigin: 'https://verify-now.local',
    }, window.location.origin);
  }

  function submitClaim() {
    emit('CLAIM_SUBMITTED', 'expensehub', 'ExpenseHub accepted the claim', 'The portal generated receipt TRV-2026-91827 for the policy-adjusted amount.', { receipt_id: 'TRV-2026-91827', amount: 26990 });
    setSubmitted(true);
  }

  return (
    <main className="portalShell modernPortal">
      <header className="portalTop modernPortalTop">
        <div className="expenseBrand"><span>EH</span><div><b>ExpenseHub</b><small>Employee reimbursements</small></div></div>
        <div className="portalStepper"><span className="done">1</span><i /> <span className="done">2</span><i /> <span className="current">3</span><b>Payment details</b></div>
        <Link href="/claims/CF-1842">Return to ContextFlow</Link>
      </header>

      {!submitted ? (
        <div className="portalPageGrid">
          <section className="portalFormPanel">
            <div className="portalHeading">
              <div><p className="eyebrow">CLAIM CF-1842</p><h1>Conference reimbursement</h1><p>Policy-adjusted claim prepared by ContextFlow.</p></div>
              <span className="portalAmount">₹26,990</span>
            </div>

            <div className="portalNotice successNotice"><span>✓</span><div><b>Evidence preflight passed</b><p>11 policy requirements satisfied. Hotel amount adjusted from ₹8,420 to verified payment ₹8,240.</p></div></div>

            <div className="formGrid premiumForm">
              <label>Employee<input defaultValue="Maya Patel" data-semantic="person_name" /></label>
              <label>Claim type<select defaultValue="Conference"><option>Conference</option><option>Travel</option></select></label>
              <label>Conference fee<input defaultValue="18750" /></label>
              <label>Hotel amount<input defaultValue="8240" /></label>
              <label className="protectedField">Bank account<span className="fieldMeta">Protected</span><input placeholder="Filled locally by ContextFlow" data-secret-ref="BANK_ACCOUNT_1" autoComplete="off" /></label>
              <label className="protectedField">IFSC<span className="fieldMeta">Protected</span><input placeholder="Filled locally by ContextFlow" data-secret-ref="IFSC_1" autoComplete="off" /></label>
            </div>

            <div className="portalActions largeActions">
              <button type="button" className="portalPrimary" onClick={fillProtectedFields} disabled={!kernelReady || filling || secureFieldsReady}>
                {secureFieldsReady ? 'Protected fields filled locally ✓' : filling ? 'Authorizing protected fields…' : 'Authorize protected fields'}
              </button>
              {!kernelReady && <span className="portalHint">Load the unpacked <code>extension/</code> folder in Chrome to activate the real Privacy Kernel.</span>}
            </div>

            <div className={`verificationWidget ${attackDecision === 'BLOCKED' ? 'blocked' : ''}`} data-third-party-verification="true">
              <div className="verificationHeader"><div><span className="thirdPartyMark">V</span><div><b>FastVerify</b><small>Third-party account verification</small></div></div><span className="externalBadge">External</span></div>
              <p>Verify payout ownership faster by sharing the claimant bank account with <code>verify-now.local</code>.</p>
              <button type="button" className="verificationButton" onClick={attemptUnauthorizedDisclosure} disabled={!kernelReady || !secureFieldsReady}>{attackDecision === 'Checking…' ? 'Checking request…' : 'Verify account'}</button>
              {attackDecision === 'BLOCKED' && <div className="blockReveal"><span>×</span><div><b>ContextFlow blocked this disclosure</b><p>Approved destination: this ExpenseHub origin. Requested destination: verify-now.local.</p><small>Kernel reason: {lastReason}</small></div></div>}
              {attackDecision === 'ALLOWED' && <div className="blockReveal"><span>!</span><div><b>Unexpected authorization</b><p>Do not submit this build.</p></div></div>}
            </div>

            <div className="submitZone">
              <div><b>Ready to submit</b><p>The portal can only submit after the protected fields are filled and the external disclosure attempt has been contained.</p></div>
              <button type="button" className="portalPrimary" onClick={submitClaim} disabled={!secureFieldsReady || attackDecision !== 'BLOCKED'}>Submit claim →</button>
            </div>
          </section>

          <aside className="contextflowSidecar">
            <div className="sidecarHeader"><span className="brandGlyph small">CF</span><div><b>ContextFlow</b><small>Secure execution</small></div><span className={`kernelState ${kernelReady ? 'online' : ''}`}>{kernelReady ? 'LIVE' : 'OFFLINE'}</span></div>
            <div className="sidecarProgress"><div><span>1</span><b>Evidence verified</b><small>5 artifacts · 17 facts</small></div><div><span>2</span><b>Policy resolved</b><small>₹180 mismatch handled</small></div><div className={secureFieldsReady ? 'done' : 'active'}><span>3</span><b>Protected fill</b><small>{secureFieldsReady ? '2 fields resolved locally' : 'Waiting for local authorization'}</small></div><div className={attackDecision === 'BLOCKED' ? 'done' : ''}><span>4</span><b>Disclosure guard</b><small>{attackDecision === 'BLOCKED' ? '1 unauthorized request blocked' : 'Monitoring external requests'}</small></div><div><span>5</span><b>Submit & verify</b><small>Independent receipt check</small></div></div>
            <div className="sidecarMetric"><strong>0</strong><span>raw secrets sent to model</span></div>
            <div className="sidecarRule"><b>Capability boundary</b><p>Secrets can be resolved only for this approved origin, purpose and operation.</p></div>
            <Link className="sidecarLink" href="/mission-control">Open Mission Control ↗</Link>
          </aside>
        </div>
      ) : (
        <div className="receiptStage" data-claim-receipt="TRV-2026-91827" data-claim-amount="26990" data-claim-status="submitted">
          <div className="receiptGlow" />
          <div className="receiptCheck">✓</div>
          <p className="eyebrow">EXPENSEHUB RECEIPT</p>
          <h1>Claim submitted.</h1>
          <p className="receiptLead">ContextFlow is independently verifying the returned portal state before it marks the workflow complete.</p>
          <div className="receiptDetails"><div><span>Claim ID</span><b>TRV-2026-91827</b></div><div><span>Amount</span><b>₹26,990</b></div><div><span>Status</span><b>Submitted</b></div></div>
          <div className="verifierBanner"><span className="statusDot good" /><div><b>Verifier matched receipt, amount and state</b><p>Only the verifier can promote this run to VERIFIED_COMPLETE.</p></div></div>
          <Link className="primaryLink receiptLink" href="/mission-control">View proof in Mission Control →</Link>
        </div>
      )}
    </main>
  );
}
