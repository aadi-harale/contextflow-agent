'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { RuntimeEvent } from '@/lib/runtime';
import { project } from '@/lib/projection';
import { readRuntimeEvents } from '@/lib/client-events';

const Node = ({ title, sub, tone = 'normal' }: { title: string; sub: string; tone?: string }) => (
  <div className={`node ${tone}`}><b>{title}</b><span>{sub}</span></div>
);

export default function Mission() {
  const [events, setEvents] = useState<RuntimeEvent[]>([]);
  const state = useMemo(() => project(events), [events]);

  useEffect(() => {
    const refresh = () => setEvents(readRuntimeEvents());
    refresh();
    const timer = window.setInterval(refresh, 400);

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

  const has = (type: RuntimeEvent['type']) => events.some((event) => event.type === type);
  const completed = state.status === 'Verified complete';
  const latest = events.at(-1);

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand"><span className="brandmark">CF</span><span>Mission Control</span></div>
        <nav><Link href="/">Overview</Link><Link href="/portal/expensehub">ExpenseHub</Link></nav>
        <span className={`pill ${events.length ? 'success' : ''}`}>
          {events.length ? (completed ? 'VERIFIED COMPLETE' : 'LIVE RUNTIME') : 'NO ACTIVE RUN'}
        </span>
      </header>

      <section className="missionHead">
        <div><p className="eyebrow">CLAIM CF-1842</p><h1>Maya Patel · Conference reimbursement</h1></div>
        <div className="amount">₹{(state.amount ?? 27170).toLocaleString('en-IN')}</div>
      </section>

      {events.length === 0 && (
        <section className="emptyMission">
          <h2>No runtime evidence yet.</h2>
          <p>Start the claim from Overview, run the Strands planning stage, then continue through ExpenseHub. Mission Control only displays events emitted by those real workflow steps.</p>
          <Link className="ghost" href="/">Start workflow →</Link>
        </section>
      )}

      {events.length > 0 && (
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
                <Node title="Evidence ledger" sub={has('FACTS_EXTRACTED') ? 'source-backed facts' : 'ingesting evidence'} />
                <Node title="Paid amount" sub="₹8,240 · bank proof" tone={has('POLICY_ADJUSTMENT_APPLIED') ? 'good' : 'normal'} />
                <Node title="Strands planner" sub={has('PLAN_READY') ? 'real plan completed' : 'not completed'} tone={has('PLAN_READY') ? 'good' : 'normal'} />
              </div>
              <div className="flowArrows">→<br />→<br />→</div>
              <div className="col">
                <Node title="Privacy kernel" sub={has('SECRET_DISCLOSURE_ALLOWED') ? 'capability exercised' : 'waiting'} tone={has('SECRET_DISCLOSURE_ALLOWED') ? 'good' : 'normal'} />
                <Node title="ExpenseHub" sub={has('CLAIM_SUBMITTED') ? 'receipt returned' : has('SECRET_DISCLOSURE_ALLOWED') ? 'approved origin' : 'not reached'} tone={has('CLAIM_SUBMITTED') ? 'good' : 'normal'} />
                <Node title="verify-now.local" sub={has('SECRET_DISCLOSURE_DENIED') ? 'blocked destination' : 'not attempted'} tone={has('SECRET_DISCLOSURE_DENIED') ? 'bad' : 'normal'} />
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panelTitle"><span>Live execution</span><small>{events.length} runtime events</small></div>
            <div className="timeline runtimeTimeline">
              {events.slice(-8).map((event) => (
                <div key={`${event.runId}-${event.eventId}`} className={event.type === 'SECRET_DISCLOSURE_DENIED' ? 'danger' : event.type === 'RUN_COMPLETED' ? 'done' : 'active'}>
                  <span><b>{event.title}</b><small>{event.actor}</small></span>
                  <b>{event.type === 'SECRET_DISCLOSURE_DENIED' ? 'BLOCK' : event.type === 'RUN_COMPLETED' ? '✓' : '•'}</b>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="panelTitle"><span>Privacy boundary</span><small>purpose-bound disclosure</small></div>
            <div className="privacyStats">
              <div><strong>{state.rawSecretsToModel}</strong><span>raw secrets to model</span></div>
              <div><strong>{state.authorizedDisclosures}</strong><span>authorized fills</span></div>
              <div><strong>{state.blockedRequests}</strong><span>blocked requests</span></div>
              <div><strong>2</strong><span>protected secrets</span></div>
            </div>
            {has('SECRET_DISCLOSURE_ALLOWED') && <div className="securityEvent"><b>LOCAL VAULT</b><span>ExpenseHub only</span><em>ALLOWED</em></div>}
            {has('SECRET_DISCLOSURE_DENIED') && <div className="securityEvent blocked"><b>BANK_ACCOUNT_1</b><span>verify-now.local</span><em>BLOCKED</em></div>}
          </section>

          <section className="panel">
            <div className="panelTitle"><span>Proof of completion</span><small>verifier-owned state</small></div>
            <div className="receipt">
              <span>Portal state</span><b>{has('CLAIM_SUBMITTED') ? 'Submitted' : 'Pending'}</b>
              <span>Claim ID</span><b>{state.receipt || '—'}</b>
              <span>Expected amount</span><b>₹26,990</b>
              <span>Observed amount</span><b>{has('SUBMISSION_VERIFIED') ? '₹26,990' : '—'}</b>
              {completed && <div className="verified">VERIFIED COMPLETE</div>}
            </div>
            {latest && <p className="missionLatest">Latest: {latest.title}</p>}
          </section>
        </div>
      )}
    </main>
  );
}
