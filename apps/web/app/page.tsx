'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { project } from '@/lib/projection';
import { readRuntimeEvents } from '@/lib/client-events';
import type { RuntimeEvent } from '@/lib/runtime';

const otherClaims = [
  {
    id: 'CF-1839',
    employee: 'Arjun Mehta',
    initials: 'AM',
    type: 'Client travel',
    requested: '₹14,200',
    status: 'Needs input',
    tone: 'danger',
    detail: 'Boarding pass missing',
    updated: '18 min ago',
    href: '#',
  },
  {
    id: 'CF-1837',
    employee: 'Priya Shah',
    initials: 'PS',
    type: 'Equipment reimbursement',
    requested: '₹8,900',
    status: 'Verified complete',
    tone: 'good',
    detail: 'Receipt ER-39117',
    updated: '34 min ago',
    href: '#',
  },
];

export default function Home() {
  const [events, setEvents] = useState<RuntimeEvent[]>([]);
  const state = useMemo(() => project(events), [events]);
  const completed = state.status === 'Verified complete';
  const hasPlan = events.some((event) => event.type === 'PLAN_READY');
  const hasPolicy = events.some((event) => event.type === 'POLICY_ADJUSTMENT_APPLIED');

  useEffect(() => {
    const refresh = () => setEvents(readRuntimeEvents());
    refresh();
    const timer = window.setInterval(refresh, 500);
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('contextflow-runtime');
      channel.onmessage = refresh;
    } catch {
      channel = null;
    }
    window.addEventListener('storage', refresh);
    return () => {
      window.clearInterval(timer);
      channel?.close();
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const mayaStatus = completed ? 'Verified complete' : hasPlan && hasPolicy ? 'Ready to execute' : events.length ? 'Processing' : 'Needs review';
  const mayaTone = completed ? 'good' : hasPlan && hasPolicy ? 'good' : 'warn';
  const mayaDetail = completed ? `Receipt ${state.receipt ?? 'TRV-2026-91827'}` : hasPlan && hasPolicy ? '1 approval required' : events.length ? 'Resolving evidence + policy' : '1 evidence conflict';

  const claims = [
    {
      id: 'CF-1842',
      employee: 'Maya Patel',
      initials: 'MP',
      type: 'Conference reimbursement',
      requested: completed ? '₹26,990' : '₹27,170',
      status: mayaStatus,
      tone: mayaTone,
      detail: mayaDetail,
      updated: completed ? 'just now' : '2 min ago',
      href: '/claims/CF-1842',
    },
    ...otherClaims,
  ];

  return (
    <main className="appShell">
      <header className="appTopbar">
        <Link className="appBrand" href="/">
          <span className="brandGlyph">CF</span>
          <span><b>ContextFlow</b><small>Finance operations</small></span>
        </Link>
        <nav className="appNav">
          <Link className="active" href="/">Claims</Link>
          <Link href="/mission-control">Mission Control</Link>
        </nav>
        <div className="topbarRight"><span className="liveDot" /> Privacy kernel ready</div>
      </header>

      <div className="workspace">
        <section className="pageIntro">
          <div>
            <p className="eyebrow">REIMBURSEMENT OPERATIONS</p>
            <h1>Claims that need your attention.</h1>
            <p>ContextFlow verifies evidence, applies policy and executes approved submissions while sensitive values remain outside the reasoning model.</p>
          </div>
          <button className="secondaryButton" type="button">New claim</button>
        </section>

        <section className="metricStrip">
          <article><span>Needs attention</span><strong>{completed ? '1' : '2'}</strong><small>{completed ? '1 missing file' : '1 conflict · 1 missing file'}</small></article>
          <article><span>Processing</span><strong>{!completed && events.length ? '1' : '0'}</strong><small>{!completed && events.length ? 'Maya · CF-1842' : 'No active runs'}</small></article>
          <article><span>Completed today</span><strong>{completed ? '15' : '14'}</strong><small>{completed ? '15 / 15 verified' : '14 / 14 verified'}</small></article>
          <article className="privacyMetric"><span>Raw secrets sent to model</span><strong>{state.rawSecretsToModel}</strong><small>Protected by local authority</small></article>
        </section>

        <section className="queueLayout">
          <div className="queuePanel">
            <div className="sectionHeader">
              <div><h2>Claims queue</h2><p>Prioritized by blockers and required decisions.</p></div>
              <div className="segmented"><button className="selected">Open</button><button>Completed</button></div>
            </div>

            <div className="claimTableHeader">
              <span>Claim</span><span>Requested</span><span>Status</span><span>Updated</span><span />
            </div>
            <div className="claimTable">
              {claims.map((claim) => (
                <Link key={claim.id} className={`claimRow ${claim.id === 'CF-1842' ? 'featured' : ''}`} href={claim.href}>
                  <div className="claimIdentity">
                    <span className="avatar">{claim.initials}</span>
                    <span><b>{claim.employee}</b><small>{claim.type} · {claim.id}</small></span>
                  </div>
                  <strong className="claimAmount">{claim.requested}</strong>
                  <div className={`statusBadge ${claim.tone}`}><i /> <span><b>{claim.status}</b><small>{claim.detail}</small></span></div>
                  <span className="updatedAt">{claim.updated}</span>
                  <span className="rowArrow">→</span>
                </Link>
              ))}
            </div>
          </div>

          <aside className="operationsRail">
            <div className="railCard spotlight">
              <p className="eyebrow">NEXT BEST ACTION</p>
              <h3>{completed ? 'Maya&apos;s claim is verified' : hasPlan && hasPolicy ? 'Approve Maya&apos;s execution' : 'Review Maya&apos;s claim'}</h3>
              <p>{completed ? 'The receipt, amount and submitted portal state all matched the intended reimbursement outcome.' : hasPlan && hasPolicy ? 'Evidence and policy are resolved. One human approval unlocks the external ExpenseHub execution.' : 'ContextFlow found a ₹180 mismatch between the hotel invoice and verified payment. Policy can resolve it automatically.'}</p>
              <Link className="primaryLink" href={completed ? '/mission-control' : '/claims/CF-1842'}>{completed ? 'View proof →' : 'Open claim →'}</Link>
            </div>

            <div className="railCard">
              <div className="railTitle"><span>System status</span><span className="statusDot good" /></div>
              <div className="systemRows">
                <div><span>Evidence ledger</span><b>Ready</b></div>
                <div><span>Policy engine</span><b>Ready</b></div>
                <div><span>Browser bridge</span><b>Ready</b></div>
                <div><span>Local secret vault</span><b>Ready</b></div>
              </div>
            </div>

            <div className="railCard compactCallout">
              <span className="shieldMark">◇</span>
              <div><b>Reasoning without authority</b><p>Strands decides what should happen. Deterministic controls decide what is true and what is allowed.</p></div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
