'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { RuntimeEvent } from '@/lib/runtime';
import { project } from '@/lib/projection';
import { readRuntimeEvents } from '@/lib/client-events';

const Node = ({ title, sub, tone = 'normal' }: { title: string; sub: string; tone?: string }) => (
  <div className={`opNode ${tone}`}><b>{title}</b><span>{sub}</span></div>
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

  return (
    <main className="appShell">
      <header className="appTopbar">
        <Link className="appBrand" href="/"><span className="brandGlyph">CF</span><span><b>ContextFlow</b><small>Finance operations</small></span></Link>
        <nav className="appNav"><Link href="/">Claims</Link><Link className="active" href="/mission-control">Mission Control</Link></nav>
        <div className="topbarRight"><span className={`statusDot ${events.length ? 'good' : ''}`} /> {completed ? 'Verified complete' : events.length ? 'Live runtime' : 'No active run'}</div>
      </header>

      <div className="workspace missionWorkspace">
        <div className="breadcrumb"><Link href="/">Claims</Link><span>/</span><Link href="/claims/CF-1842">CF-1842</Link><span>/</span><span>Mission Control</span></div>

        <section className="missionHero">
          <div><p className="eyebrow">MISSION CONTROL · CF-1842</p><h1>One claim. Every decision visible.</h1><p>Runtime truth projected from evidence, policy, browser execution, privacy decisions and independent verification.</p></div>
          <div className="missionOutcome"><span>{completed ? 'VERIFIED COMPLETE' : events.length ? 'RUN IN PROGRESS' : 'WAITING FOR RUN'}</span><strong>₹{(state.amount ?? 27170).toLocaleString('en-IN')}</strong><small>{state.receipt || 'No receipt yet'}</small></div>
        </section>

        {events.length === 0 ? (
          <section className="emptyMission contentCard">
            <div className="emptyOrb" />
            <h2>No runtime evidence yet.</h2>
            <p>Open Maya&apos;s claim and run ContextFlow. This screen only renders facts and decisions that were actually emitted by the workflow.</p>
            <Link className="primaryLink" href="/claims/CF-1842">Open Maya&apos;s claim →</Link>
          </section>
        ) : (
          <div className="missionGrid">
            <section className="contentCard operationalGraphCard">
              <div className="sectionHeader"><div><p className="eyebrow">OPERATIONAL GRAPH</p><h2>Evidence → authority → outcome</h2></div><span className="softBadge">{events.length} runtime events</span></div>
              <div className="operationalGraph">
                <div className="graphColumn">
                  <p>Evidence</p>
                  <Node title="Conference invoice" sub="₹18,750 · supported" tone={has('FACTS_EXTRACTED') ? 'good' : 'normal'} />
                  <Node title="Hotel invoice" sub="₹8,420" tone={has('CONFLICT_DETECTED') ? 'warn' : 'normal'} />
                  <Node title="Bank payment" sub="₹8,240 · verified" tone={has('POLICY_ADJUSTMENT_APPLIED') ? 'good' : 'normal'} />
                </div>
                <div className="graphConnector"><span>→</span><span>→</span><span>→</span></div>
                <div className="graphColumn">
                  <p>Reasoning & policy</p>
                  <Node title="Evidence ledger" sub={has('FACTS_EXTRACTED') ? 'source-backed facts' : 'waiting'} tone={has('FACTS_EXTRACTED') ? 'good' : 'normal'} />
                  <Node title="HOTEL_001" sub={has('POLICY_ADJUSTMENT_APPLIED') ? 'selected ₹8,240' : 'waiting'} tone={has('POLICY_ADJUSTMENT_APPLIED') ? 'good' : 'normal'} />
                  <Node title="Strands planner" sub={has('PLAN_READY') ? 'safe plan ready' : 'not completed'} tone={has('PLAN_READY') ? 'good' : 'normal'} />
                </div>
                <div className="graphConnector"><span>→</span><span>→</span><span>→</span></div>
                <div className="graphColumn">
                  <p>Execution</p>
                  <Node title="Privacy kernel" sub={has('SECRET_DISCLOSURE_ALLOWED') ? 'capability exercised' : 'waiting'} tone={has('SECRET_DISCLOSURE_ALLOWED') ? 'good' : 'normal'} />
                  <Node title="ExpenseHub" sub={has('CLAIM_SUBMITTED') ? 'receipt returned' : 'approved destination'} tone={has('CLAIM_SUBMITTED') ? 'good' : 'normal'} />
                  <Node title="verify-now.local" sub={has('SECRET_DISCLOSURE_DENIED') ? 'disclosure blocked' : 'not attempted'} tone={has('SECRET_DISCLOSURE_DENIED') ? 'bad' : 'normal'} />
                </div>
              </div>
            </section>

            <section className="contentCard privacyCard">
              <div className="sectionHeader"><div><p className="eyebrow">PRIVACY BOUNDARY</p><h2>Secrets stayed local.</h2></div></div>
              <div className="privacyKpis"><div><strong>{state.rawSecretsToModel}</strong><span>raw secrets to model</span></div><div><strong>{state.authorizedDisclosures}</strong><span>authorized local fills</span></div><div><strong>{state.blockedRequests}</strong><span>blocked requests</span></div><div><strong>2</strong><span>protected values</span></div></div>
              <div className="dataFlow"><div className="secretNode"><b>BANK_ACCOUNT_1</b><span>local vault</span></div><div className="flowSplit"><div className={has('SECRET_DISCLOSURE_ALLOWED') ? 'allowed' : ''}><span>→</span><b>ExpenseHub</b><small>approved</small></div><div className={has('SECRET_DISCLOSURE_DENIED') ? 'blocked' : ''}><span>→</span><b>verify-now.local</b><small>{has('SECRET_DISCLOSURE_DENIED') ? 'blocked' : 'not requested'}</small></div></div></div>
            </section>

            <section className="contentCard executionCard">
              <div className="sectionHeader"><div><p className="eyebrow">LIVE EXECUTION</p><h2>What actually happened</h2></div></div>
              <div className="eventTimeline">
                {events.slice(-10).map((event) => <div key={`${event.runId}-${event.eventId}`} className={event.type === 'SECRET_DISCLOSURE_DENIED' ? 'danger' : event.type === 'RUN_COMPLETED' ? 'complete' : ''}><span className="timelineDot" /><div><b>{event.title}</b><p>{event.detail}</p><small>{event.actor.replaceAll('_', ' ')}</small></div></div>)}
              </div>
            </section>

            <section className="contentCard proofCard">
              <div className="sectionHeader"><div><p className="eyebrow">PROOF OF COMPLETION</p><h2>A click is not success.</h2></div></div>
              <div className="verificationList"><div><span>Portal state</span><b className={has('CLAIM_SUBMITTED') ? 'pass' : ''}>{has('CLAIM_SUBMITTED') ? 'Submitted' : 'Pending'}</b></div><div><span>Receipt ID</span><b className={state.receipt ? 'pass' : ''}>{state.receipt || '—'}</b></div><div><span>Expected amount</span><b>₹26,990</b></div><div><span>Observed amount</span><b className={has('SUBMISSION_VERIFIED') ? 'pass' : ''}>{has('SUBMISSION_VERIFIED') ? '₹26,990' : '—'}</b></div></div>
              {completed ? <div className="completionSeal"><span>✓</span><div><b>VERIFIED COMPLETE</b><small>Promoted by the independent verifier</small></div></div> : <Link className="secondaryLink" href="/portal/expensehub">Continue execution →</Link>}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
