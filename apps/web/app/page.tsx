'use client';

import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import type { RuntimeEvent } from '@/lib/runtime';
import { project } from '@/lib/projection';
import { appendRuntimeEvent, clearRuntimeEvents, setCurrentRunId } from '@/lib/client-events';

type AgentState = 'idle' | 'calling' | 'ready' | 'unavailable';

export default function Home() {
  const [events, setEvents] = useState<RuntimeEvent[]>([]);
  const [running, setRunning] = useState(false);
  const [agentState, setAgentState] = useState<AgentState>('idle');
  const [agentMessage, setAgentMessage] = useState('');
  const sourceRef = useRef<EventSource | null>(null);
  const state = useMemo(() => project(events), [events]);
  const current = events.at(-1);

  async function run() {
    if (running) return;
    sourceRef.current?.close();
    setEvents([]);
    clearRuntimeEvents();
    setRunning(true);
    setAgentState('calling');
    setAgentMessage('Calling the Strands planner against sanitized claim state…');

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
          ? 'Strands planner completed. Protected values remained opaque references.'
          : 'Strands backend is not connected. Evidence checks can run, but PLAN_READY will not be emitted.',
      );
    } catch {
      setAgentState('unavailable');
      setAgentMessage('Strands backend is not reachable. Start apps/api and configure CONTEXTFLOW_AGENT_API_URL.');
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
    <main className="shell">
      <header className="topbar">
        <div className="brand"><span className="brandmark">CF</span><span>ContextFlow</span></div>
        <nav><Link href="/mission-control">Mission Control</Link><Link href="/portal/expensehub">ExpenseHub</Link></nav>
        <span className="pill">Professional Agent</span>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">PRIVACY-PRESERVING PROFESSIONAL AGENT</p>
          <h1>Process the claim.<br /><span>Never leak the secret.</span></h1>
          <p className="lede">ContextFlow reads reimbursement policy and evidence, verifies every claim fact, completes the browser workflow, and proves the final submission — while protected values stay behind a deterministic privacy boundary.</p>
          <div className="actions">
            <button onClick={run} disabled={running}>{running ? 'Running…' : 'Run evidence + Strands plan'}</button>
            <Link className="ghost" href="/portal/expensehub">Continue in ExpenseHub →</Link>
            <Link className="ghost" href="/mission-control">Mission Control →</Link>
          </div>
          {agentState !== 'idle' && (
            <div className={`agentStatus ${agentState}`}>
              <b>{agentState === 'ready' ? 'STRANDS CONNECTED' : agentState === 'calling' ? 'STRANDS RUNNING' : 'STRANDS NOT CONNECTED'}</b>
              <span>{agentMessage}</span>
            </div>
          )}
        </div>

        <div className="claimcard">
          <div className="row">
            <div><span className="muted">ACTIVE CLAIM</span><h3>Maya Patel · Conference</h3></div>
            <span className={`state ${state.status === 'Verified complete' ? 'ok' : ''}`}>{state.status}</span>
          </div>
          <div className="amount">₹{(state.amount ?? 27170).toLocaleString('en-IN')}</div>
          <div className="progress"><i style={{ width: `${Math.min(100, events.length ? (events.length / 6) * 100 : 0)}%` }} /></div>
          <div className="metricgrid">
            <div><b>{state.policyRules || '—'}</b><small>policy rules</small></div>
            <div><b>{state.evidenceItems || '—'}</b><small>evidence facts</small></div>
            <div><b>{state.rawSecretsToModel}</b><small>raw secrets exposed</small></div>
          </div>
          {current && <div className="event"><span className="dot" /><div><b>{current.title}</b><p>{current.detail}</p></div></div>}
        </div>
      </section>

      <section className="why">
        <article><span>01</span><h3>Evidence, not guesses</h3><p>Every material field is tied to source evidence, confidence and deterministic checks.</p></article>
        <article><span>02</span><h3>Reasoning without authority</h3><p>Strands plans the workflow. A local policy kernel controls secret release and risky actions.</p></article>
        <article><span>03</span><h3>Verified completion</h3><p>A click is not success. ContextFlow validates the receipt, amount and resulting portal state.</p></article>
      </section>
    </main>
  );
}
