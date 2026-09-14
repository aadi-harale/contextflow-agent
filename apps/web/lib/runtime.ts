export type EventType =
  | 'RUN_CREATED'
  | 'DOCUMENTS_HASHED'
  | 'FACTS_EXTRACTED'
  | 'CONFLICT_DETECTED'
  | 'POLICY_ADJUSTMENT_APPLIED'
  | 'PLAN_READY'
  | 'BROWSER_SNAPSHOT_READY'
  | 'SECRET_DISCLOSURE_ALLOWED'
  | 'SECRET_DISCLOSURE_DENIED'
  | 'CLAIM_SUBMITTED'
  | 'SUBMISSION_VERIFIED'
  | 'RUN_COMPLETED';

export type RuntimeEvent = {
  eventId: string;
  runId: string;
  claimId: string;
  timestamp: string;
  type: EventType;
  actor:
    | 'runtime'
    | 'evidence_ledger'
    | 'policy_engine'
    | 'strands_agent'
    | 'browser_bridge'
    | 'privacy_kernel'
    | 'expensehub'
    | 'verifier';
  title: string;
  detail: string;
  data?: Record<string, string | number | boolean>;
};

const now = () => new Date().toISOString();
const id = (n: number) => `evt_${String(n).padStart(4, '0')}`;

export function buildDemoRun(runId: string): RuntimeEvent[] {
  const claimId = 'CF-1842';
  const hotelInvoice = 8420;
  const hotelPaid = 8240;
  const conferenceFee = 18750;
  const approvedAmount = conferenceFee + Math.min(hotelInvoice, hotelPaid);
  const difference = hotelInvoice - hotelPaid;

  const e = (
    n: number,
    type: EventType,
    actor: RuntimeEvent['actor'],
    title: string,
    detail: string,
    data: RuntimeEvent['data'] = {},
  ): RuntimeEvent => ({
    eventId: id(n),
    runId,
    claimId,
    timestamp: now(),
    type,
    actor,
    title,
    detail,
    data,
  });

  return [
    e(1, 'RUN_CREATED', 'runtime', 'Reimbursement run created', 'ContextFlow accepted the conference reimbursement objective.', { requested_amount: 27170 }),
    e(2, 'DOCUMENTS_HASHED', 'evidence_ledger', 'Evidence artifacts fingerprinted', 'Five evidence artifacts were assigned SHA-256 identities before extraction.', { documents: 5 }),
    e(3, 'FACTS_EXTRACTED', 'evidence_ledger', 'Evidence ledger populated', 'Seventeen material facts were extracted with source provenance.', { facts: 17 }),
    e(4, 'CONFLICT_DETECTED', 'evidence_ledger', '₹180 evidence conflict detected', 'Hotel invoice total does not match the amount actually paid.', { invoice_amount: hotelInvoice, paid_amount: hotelPaid, difference }),
    e(5, 'POLICY_ADJUSTMENT_APPLIED', 'policy_engine', 'Policy capped hotel reimbursement', 'Deterministic rule HOTEL_001 selected the verified paid amount.', { selected_hotel_amount: hotelPaid, approved_total: approvedAmount }),
    e(6, 'PLAN_READY', 'strands_agent', 'Sanitized browser plan ready', 'Strands planned the ExpenseHub workflow using opaque secret references.', { raw_secrets_in_plan: 0 }),
    e(7, 'BROWSER_SNAPSHOT_READY', 'browser_bridge', 'ExpenseHub semantic snapshot captured', 'The browser bridge exposed labels, roles, and opaque secret references only.', { sensitive_fields: 2 }),
    e(8, 'SECRET_DISCLOSURE_ALLOWED', 'privacy_kernel', 'Bank disclosure authorized', 'BANK_ACCOUNT_1 may be resolved locally only for reimbursement_payment on the approved ExpenseHub origin.', { secret_ref: 'BANK_ACCOUNT_1', destination: 'expensehub_demo' }),
    e(9, 'SECRET_DISCLOSURE_DENIED', 'privacy_kernel', 'Unauthorized disclosure blocked', 'A verification widget requested BANK_ACCOUNT_1 for an unapproved destination. The deterministic kernel denied it.', { secret_ref: 'BANK_ACCOUNT_1', destination: 'verify-now.local', reason: 'origin_not_authorized' }),
    e(10, 'CLAIM_SUBMITTED', 'expensehub', 'ExpenseHub accepted the claim', 'The portal returned receipt TRV-2026-91827.', { receipt_id: 'TRV-2026-91827', amount: approvedAmount }),
    e(11, 'SUBMISSION_VERIFIED', 'verifier', 'Portal outcome independently verified', 'Observed receipt, amount, and submitted status match the intended claim state.', { receipt_id: 'TRV-2026-91827', amount: approvedAmount, verified: true }),
    e(12, 'RUN_COMPLETED', 'verifier', 'Verified complete', 'Only the verifier transitioned the run to VERIFIED_COMPLETE.', { final_amount: approvedAmount, raw_secrets_to_model: 0 }),
  ];
}
