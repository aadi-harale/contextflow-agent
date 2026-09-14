'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { RuntimeEvent } from '@/lib/runtime';
import { project } from '@/lib/projection';

const Node = ({ title, sub, tone = 'normal' }: { title: string; sub: string; tone?: string }) => (
  <div className={`node ${tone}`}><b>{title}</b><span>{sub}</span></div>
);

export default function Mission() {
  const [events, setEvents] = useState<RuntimeEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const state = useMemo(() => project(events), [events]);

  useEffect(() => {
    const runId = `mission_${Date.now()}`;
    const source = new EventSource(`/api/runs/${runId}/events`);

    source.onopen = () => setConnected(true);
    source.onmessage = (message) => setEvents((prev) => [...prev, JSON.parse(message.data) as RuntimeEvent]);
    source.addEventListener('done', () => {
      setConnected(false);
      source.close();
    });
    source.onerror = () => {
      setConnected(false);
      source.close();
    };

    return () => source.close();
  }, []);

  const has = (type: RuntimeEvent['type']) => events.some((event) => event.type === type);

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand"><span className="brandmark">CF</span><span>Mission Control</span></div>
        <nav><Link href="/">Overview</Link><Link href="/portal/expensehub">ExpenseHub</Link></nav>
        <span className={`pill ${connected ? 'success' : ''}`}>{connected ? 'LIVE RUNTIME' : 'RUN COMPLETE'}</span>
      </header>

      <section className="missionHead">
        <div><p className="eyebrow">CLAIM CF-1842</p><h1>Maya Patel · Conference reimbursement</h1></div>
        <div className="amount">₹{(state.amount ?? 26990).toLocaleString('en-IN')}</div>
      </section>

      <div className="controlGrid">
        <section className="panel graph">
          <div className="panelTitle"><span>Operational Graph</span><small>projected from runtime events</small></div>
          <div className="graphCanvas">
            <div className="col">
              <Node title="Policy" sub={has('POLICY_ADJUSTMENT_APPLIED') ? '11 rules evaluated' : 'waiting for policy'} />
              <Node title="Conference invoice" sub="₹18,750 · supported" tone={has('FACTS_EXTRACTED') ? 'good' : 'normal'} />
              <Node title="Hotel invoice" sub="₹8,420" tone={has('CONFLICT_DETECTED') ? 'warn' : 'normal'} />
            </div>
            <div className="flowArrows">→<br />→<br />⇄</div>
            <div className="col">
              <Node title="Evidence ledger" sub={has('FACTS_EXTRACTED') ? '17 facts + provenance' : 'ingesting evidence'} />
              <Node title="Paid amount" sub="₹8,240 · bank proof" tone={has('POLICY_ADJUSTMENT_APPLIED') ? 'good' : 'normal'} />
              <Node title="Conflict resolver" sub={has('CONFLICT_DETECTED') ? '₹180 mismatch' : 'waiting'} tone={has('CONFLICT_DETECTED') ? 'warn' : 'normal'} />
            </div>
            <div className="flowArrows">→<br />→<br />→</div>
            <div className="col">
              <Node title="Privacy kernel" sub={has('SECRET_DISCLOSURE_ALLOWED') ? 'capability checked' : 'waiting'} tone={has('SECRET_DISCLOSURE_ALLOWED') ? 'good' : 'normal'} />
              <Node title="ExpenseHub" sub={has('SECRET_DISCLOSURE_ALLOWED') ? 'approved origin' : 'not reached'} tone={has('SECRET_DISCLOSURE_ALLOWED') ? 'good' : 'normal'} />
              <Node title="verify-now.local" sub={has('SECRET_DISCLOSURE_DENIED') ? 'blocked destination' : 'not requested'} tone={has('SECRET_DISCLOSURE_DENIED') ? 'bad' : 'normal'} />
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panelTitle"><span>Live execution</span><small>{events.length}/12 events</small></div>
          <div className="timeline runtimeTimeline">
            {events.slice(-7).map((event) => (
              <div key={event.eventId} className={event.type === 'SECRET_DISCLOSURE_DENIED' ? 'danger' : event.type === 'RUN_COMPLETED' ? 'done' : 'active'}>
                <span><b>{event.title}</b><small>{event.actor}</small></span>
                <b>{event.type === 'SECRET_DISCLOSURE_DENIED' ? 'BLOCK' : event.type === 'RUN_COMPLETED' ? '✓' : '•'}</b>
              </div>
            ))}
            {events.length === 0 && <div className="active">Waiting for runtime events <b>•••</b></div>}
          </div>
        </section>

        <section className="panel">
          <div className="panelTitle"><span>Privacy boundary</span><small>purpose-bound disclosure</small></div>
          <div className="privacyStats">
            <div><strong>{state.rawSecretsToModel}</strong><span>raw secrets to model</span></div>
            <div><strong>{state.authorizedDisclosures}</strong><span>authorized disclosures</span></div>
            <div><strong>{state.blockedRequests}</strong><span>blocked requests</span></div>
            <div><strong>2</strong><span>protected secrets</span></div>
          </div>
          {has('SECRET_DISCLOSURE_ALLOWED') && <div className="securityEvent"><b>BANK_ACCOUNT_1</b><span>expensehub_demo</span><em>ALLOWED</em></div>}
          {has('SECRET_DISCLOSURE_DENIED') && <div className="securityEvent blocked"><b>BANK_ACCOUNT_1</b><span>verify-now.local</span><em>BLOCKED</em></div>}
        </section>

        <section className="panel">
          <div className="panelTitle"><span>Proof of completion</span><small>verifier-owned state</small></div>
          <div className="receipt">
            <span>Portal state</span><b>{has('CLAIM_SUBMITTED') ? 'Submitted' : 'Pending'}</b>
            <span>Claim ID</span><b>{state.receipt || '—'}</b>
            <span>Expected amount</span><b>₹26,990</b>
            <span>Observed amount</span><b>{has('SUBMISSION_VERIFIED') ? '₹26,990' : '—'}</b>
            {state.status === 'Verified complete' && <div className="verified">VERIFIED COMPLETE</div>}
          </div>
        </section>
      </div>
    </main>
  );
}
