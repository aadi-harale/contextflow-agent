'use client';

import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import type { RuntimeEvent } from '@/lib/runtime';
import { project } from '@/lib/projection';

export default function Home() {
  const [events, setEvents] = useState<RuntimeEvent[]>([]);
  const [running, setRunning] = useState(false);
  const sourceRef = useRef<EventSource | null>(null);
  const state = useMemo(() => project(events), [events]);
  const current = events.at(-1);

  function run() {
    if (running) return;
    sourceRef.current?.close();
    setEvents([]);
    setRunning(true);

    const runId = `run_${Date.now()}`;
    const source = new EventSource(`/api/runs/${runId}/events`);
    sourceRef.current = source;

    source.onmessage = (message) => {
      const event = JSON.parse(message.data) as RuntimeEvent;
      setEvents((prev) => [...prev, event]);
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
            <button onClick={run}>{running ? 'Running…' : 'Run end-to-end demo'}</button>
            <Link className="ghost" href="/mission-control">Open Mission Control →</Link>
          </div>
        </div>

        <div className="claimcard">
          <div className="row">
            <div><span className="muted">ACTIVE CLAIM</span><h3>Maya Patel · Conference</h3></div>
            <span className={`state ${state.status === 'Verified complete' ? 'ok' : ''}`}>{state.status}</span>
          </div>
          <div className="amount">₹{(state.amount ?? 26990).toLocaleString('en-IN')}</div>
          <div className="progress"><i style={{ width: `${events.length ? (events.length / 12) * 100 : 0}%` }} /></div>
          <div className="metricgrid">
            <div><b>{state.policyRules || '—'}</b><small>policy rules</small></div>
            <div><b>{events.length ? '17' : '—'}</b><small>evidence facts</small></div>
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
