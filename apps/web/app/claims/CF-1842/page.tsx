'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { RuntimeEvent } from '@/lib/runtime';
import { project } from '@/lib/projection';
import { appendRuntimeEvent, clearRuntimeEvents, readRuntimeEvents, setCurrentRunId } from '@/lib/client-events';

type AgentState = 'idle' | 'calling' | 'ready' | 'unavailable';

const evidence = [
  ['Conference invoice.pdf', '₹18,750', 'Conference fee'],
  ['Hotel invoice.pdf', '₹8,420', 'Hotel total'],
  ['Bank payment.pdf', '₹26,990', 'Verified payment'],
  ['Boarding pass.pdf', 'PNQ → BLR', 'Travel proof'],
  ['Employee profile.json', 'PERSON_1', 'Employee profile'],
];

export default function ClaimWorkspace() {
  const [events, setEvents] = useState<RuntimeEvent[]>([]);
  const [running, setRunning] = useState(false);
  const [agentState, setAgentState] = useState<AgentState>('idle');
  const [agentMessage, setAgentMessage] = useState('');
  const sourceRef = useRef<EventSource | null>(null);
  const state = useMemo(() => project(events), [events]);
  const has = (type: RuntimeEvent['type']) => events.some((event) => event.type === type);
  const readyForApproval = has('POLICY_ADJUSTMENT_APPLIED') && has('PLAN_READY');
  const conflict = state.conflict;

  useEffect(() => {
    setEvents(readRuntimeEvents());
    return () => sourceRef.current?.close();
  }, []);

  async function run() {
    if (running) return;
    sourceRef.current?.close();
    clearRuntimeEvents();
    setEvents([]);
    setRunning(true);
    setAgentState('calling');
    setAgentMessage('Calling Strands against sanitized claim state…');

    const runId = `run_${Date.now()}`;
    setCurrentRunId(runId);

    let agentPlanReady = false;
    try {
      const response = await fetch('/api/agent/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instruction:
            'Process claim CF-1842. Inspect evidence, evaluate reimbursement policy, and produce a safe browser plan using opaque secret references only. Do not reveal protected values.',
        }),
      });
      const payload = await response.json();
      agentPlanReady = response.ok && payload.ok === true;
      setAgentState(agentPlanReady ? 'ready' : 'unavailable');
      setAgentMessage(
        agentPlanReady
          ? 'Strands produced a browser plan using only sanitized facts and opaque secret references.'
          : 'Strands backend is not connected to this deployment yet. Evidence and policy checks still ran, but execution approval stays locked.',
      );
    } catch {
      setAgentState('unavailable');
      setAgentMessage('Strands backend is not reachable. Configure CONTEXTFLOW_AGENT_API_URL before the final demo.');
    }

    const source = new EventSource(`/api/runs/${runId}/events?agentPlanReady=${agentPlanReady ? '1' : '0'}`);
    sourceRef.current = source;

    source.onmessage = (message) => {
      const event = JSON.parse(message.data) as RuntimeEvent;
      setEvents((prev) => [...prev, event]);
      appendRuntimeEvent(event);
    };
    source.addEventListener('done', () => {
      setRunning(false);
      source.close();
    });
    source.onerror = () => {
      setRunning(false);
      source.close();
    };
  }

  return (
    <main className="appShell">
      <header className="appTopbar">
        <Link className="appBrand" href="/">
          <span className="brandGlyph">CF</span>
          <span><b>ContextFlow</b><small>Finance operations</small></span>
        </Link>
        <nav className="appNav"><Link className="active" href="/">Claims</Link><Link href="/mission-control">Mission Control</Link></nav>
        <div className="topbarRight"><span className="liveDot" /> Privacy kernel ready</div>
      </header>

      <div className="workspace claimWorkspace">
        <div className="breadcrumb"><Link href="/">Claims</Link><span>/</span><span>CF-1842</span></div>

        <section className="claimHero">
          <div className="claimHeroTitle">
            <span className="avatar large">MP</span>
            <div><p className="eyebrow">CLAIM CF-1842</p><h1>Maya Patel</h1><p>Conference reimbursement · submitted Sep 14, 2026</p></div>
          </div>
          <div className="claimHeroAmount"><small>Requested</small><strong>₹27,170</strong><span className="statusBadge warn"><i /> Needs review</span></div>
        </section>

        <section className="claimProgressBar">
          {['Evidence', 'Policy', 'Plan', 'Approval', 'Execution', 'Verification'].map((label, index) => {
            const done = index === 0 ? has('FACTS_EXTRACTED') : index === 1 ? has('POLICY_ADJUSTMENT_APPLIED') : index === 2 ? has('PLAN_READY') : false;
            const active = index === 0 ? events.length > 0 && !done : index === 1 ? has('FACTS_EXTRACTED') && !done : index === 2 ? has('POLICY_ADJUSTMENT_APPLIED') && !done : index === 3 ? readyForApproval : false;
            return <div key={label} className={`${done ? 'done' : ''} ${active ? 'active' : ''}`}><span>{done ? '✓' : index + 1}</span><b>{label}</b></div>;
          })}
        </section>

        <div className="claimGrid">
          <div className="claimMain">
            <section className="contentCard agentRunCard">
              <div className="sectionHeader">
                <div><p className="eyebrow">AGENT RUN</p><h2>Resolve the claim before anyone touches the portal.</h2><p>ContextFlow will inspect evidence, reconcile conflicts and apply reimbursement policy before asking for one final execution approval.</p></div>
                <button className="primaryButton" onClick={run} disabled={running}>{running ? 'Processing…' : events.length ? 'Run again' : 'Run ContextFlow'}</button>
              </div>

              {agentState !== 'idle' && <div className={`agentBanner ${agentState}`}><div className="agentOrb" /><div><b>{agentState === 'calling' ? 'Strands is reasoning' : agentState === 'ready' ? 'Strands plan ready' : 'Strands connection required'}</b><p>{agentMessage}</p></div></div>}

              <div className="executionFeed">
                {events.length === 0 ? (
                  <div className="emptyFeed"><span className="pulseRing" /><div><b>Ready to process</b><p>Start the run to build a source-backed claim state.</p></div></div>
                ) : events.map((event) => (
                  <div key={`${event.runId}-${event.eventId}`} className={`feedItem ${event.type === 'CONFLICT_DETECTED' ? 'warning' : ''}`}>
                    <span className="feedIcon">{event.type === 'CONFLICT_DETECTED' ? '!' : '✓'}</span>
                    <div><b>{event.title}</b><p>{event.detail}</p></div>
                    <small>{event.actor.replaceAll('_', ' ')}</small>
                  </div>
                ))}
              </div>
            </section>

            <section className="contentCard">
              <div className="sectionHeader"><div><p className="eyebrow">EVIDENCE</p><h2>5 source artifacts</h2></div><span className="softBadge">SHA-256 fingerprinted</span></div>
              <div className="evidenceGrid">
                {evidence.map(([name, value, kind], index) => <div className="evidenceCard" key={name}><span className="fileGlyph">{index + 1}</span><div><b>{name}</b><p>{kind}</p></div><strong>{value}</strong></div>)}
              </div>
            </section>

            <section className={`contentCard policyDecision ${conflict ? 'visible' : ''}`}>
              <div className="sectionHeader"><div><p className="eyebrow">POLICY DECISION</p><h2>{conflict ? 'The evidence disagrees. Policy resolves it.' : 'Waiting for validated evidence'}</h2></div>{conflict && <span className="statusBadge warn"><i /> ₹{conflict.difference} mismatch</span>}</div>
              {conflict ? (
                <>
                  <div className="compareAmounts"><div><span>Hotel invoice</span><strong>₹{conflict.invoice.toLocaleString('en-IN')}</strong><small>hotel_invoice.pdf</small></div><div className="comparisonArrow">≠</div><div><span>Verified payment</span><strong>₹{conflict.paid.toLocaleString('en-IN')}</strong><small>bank_payment.pdf</small></div></div>
                  <div className="ruleCallout"><span>HOTEL_001</span><div><b>Reimburse the lower verified paid amount.</b><p>ContextFlow applies the deterministic rule instead of asking the model to choose a number.</p></div><strong>₹8,240</strong></div>
                </>
              ) : <p className="mutedCopy">Run ContextFlow to populate the evidence ledger and evaluate the reimbursement policy.</p>}
            </section>
          </div>

          <aside className="claimRail">
            <section className="contentCard summaryCard">
              <p className="eyebrow">CLAIM SUMMARY</p>
              <div className="summaryTotal"><span>Eligible reimbursement</span><strong>{has('POLICY_ADJUSTMENT_APPLIED') ? '₹26,990' : '—'}</strong>{has('POLICY_ADJUSTMENT_APPLIED') && <small>₹180 adjusted by policy</small>}</div>
              <div className="summaryRows"><div><span>Conference</span><b>₹18,750</b></div><div><span>Hotel</span><b>{has('POLICY_ADJUSTMENT_APPLIED') ? '₹8,240' : '₹8,420'}</b></div><div><span>Policy rules</span><b>{has('POLICY_ADJUSTMENT_APPLIED') ? '11 / 11' : '—'}</b></div><div><span>Protected fields</span><b>2</b></div></div>
            </section>

            <section className={`contentCard approvalCard ${readyForApproval ? 'ready' : ''}`}>
              <div className="approvalLock">{readyForApproval ? '✓' : '◇'}</div>
              <p className="eyebrow">EXECUTION GATE</p>
              <h3>{readyForApproval ? 'Ready for one human decision.' : 'Execution remains locked.'}</h3>
              <p>{readyForApproval ? 'The evidence and policy are resolved. Approve ContextFlow to enter the verified claim in ExpenseHub.' : 'A verified Strands plan and policy decision are required before browser execution.'}</p>
              <div className="protectedList"><span><i /> Bank account <b>local only</b></span><span><i /> IFSC <b>local only</b></span></div>
              {readyForApproval ? <Link className="primaryLink wide" href="/portal/expensehub">Approve & execute →</Link> : <button className="primaryButton wide" disabled>Approve & execute</button>}
            </section>

            <section className="contentCard trustCard">
              <p className="eyebrow">AUTHORITY MODEL</p>
              <div className="authorityFlow"><div><b>Strands</b><span>plans</span></div><em>→</em><div><b>Ledger</b><span>proves</span></div><em>→</em><div><b>Kernel</b><span>authorizes</span></div></div>
              <p>The model can propose an action. It cannot invent evidence, reveal a secret or mark the run complete.</p>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
