import { createHash } from 'node:crypto';

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

const EVIDENCE = {
  'conference_invoice.txt': 'employee=PERSON_1\nconference_fee=18750\ninvoice_date=2026-08-12',
  'hotel_invoice.txt': 'employee=PERSON_1\nhotel_invoice_total=8420\nhotel_date=2026-08-13',
  'bank_payment.txt': 'employee=PERSON_1\nconference_paid=18750\nhotel_paid=8240\ntransaction=TXN419',
  'boarding_pass.txt': 'employee=PERSON_1\nroute=PNQ-BLR\ndate=2026-08-12',
  'employee_profile.txt': 'employee=PERSON_1\nclaim_type=conference_reimbursement\nbank_ref=BANK_ACCOUNT_1\nifsc_ref=IFSC_1',
} as const;

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
const now = () => new Date().toISOString();
const id = (n: number) => `evt_${String(n).padStart(4, '0')}`;

export function buildDemoRun(runId: string): RuntimeEvent[] {
  const claimId = 'CF-1842';
  const hotelInvoice = 8420;
  const hotelPaid = 8240;
  const conferenceFee = 18750;
  const approvedHotel = Math.min(hotelInvoice, hotelPaid);
  const approvedAmount = conferenceFee + approvedHotel;
  const difference = hotelInvoice - hotelPaid;
  const hashes = Object.fromEntries(Object.entries(EVIDENCE).map(([name, body]) => [name, sha256(body)]));
  const facts = [
    'employee=PERSON_1',
    `conference_fee=${conferenceFee}`,
    `hotel_invoice_total=${hotelInvoice}`,
    `hotel_amount_paid=${hotelPaid}`,
    'claim_type=conference_reimbursement',
    'boarding_pass_present=true',
    'bank_ref=BANK_ACCOUNT_1',
    'ifsc_ref=IFSC_1',
  ];

  const e = (
    n: number,
    type: EventType,
    actor: RuntimeEvent['actor'],
    title: string,
    detail: string,
    data: RuntimeEvent['data'] = {},
  ): RuntimeEvent => ({
    eventId: id(n), runId, claimId, timestamp: now(), type, actor, title, detail, data,
  });

  return [
    e(1, 'RUN_CREATED', 'runtime', 'Reimbursement run created', 'ContextFlow accepted the conference reimbursement objective.', { requested_amount: conferenceFee + hotelInvoice }),
    e(2, 'DOCUMENTS_HASHED', 'evidence_ledger', 'Evidence artifacts fingerprinted', 'Five synthetic evidence artifacts received SHA-256 identities before extraction.', {
      documents: Object.keys(EVIDENCE).length,
      conference_invoice_sha256: hashes['conference_invoice.txt'],
      hotel_invoice_sha256: hashes['hotel_invoice.txt'],
      bank_payment_sha256: hashes['bank_payment.txt'],
    }),
    e(3, 'FACTS_EXTRACTED', 'evidence_ledger', 'Evidence ledger populated', `${facts.length} material facts were derived from the evidence fixtures with explicit provenance.`, { facts: facts.length }),
    e(4, 'CONFLICT_DETECTED', 'evidence_ledger', `₹${difference} evidence conflict detected`, 'Hotel invoice total does not match the amount actually paid.', { invoice_amount: hotelInvoice, paid_amount: hotelPaid, difference }),
    e(5, 'POLICY_ADJUSTMENT_APPLIED', 'policy_engine', 'Policy capped hotel reimbursement', 'Deterministic rule HOTEL_001 selected min(invoice total, verified paid amount).', { selected_hotel_amount: approvedHotel, approved_total: approvedAmount }),
    e(6, 'PLAN_READY', 'strands_agent', 'Sanitized browser plan ready', 'The planner is constrained to opaque protected references; raw secrets are outside its authority boundary.', { raw_secrets_in_plan: 0 }),
    e(7, 'BROWSER_SNAPSHOT_READY', 'browser_bridge', 'ExpenseHub semantic snapshot captured', 'The browser bridge exposes labels, roles, and opaque secret references rather than protected values.', { sensitive_fields: 2 }),
    e(8, 'SECRET_DISCLOSURE_ALLOWED', 'privacy_kernel', 'Bank disclosure authorized', 'BANK_ACCOUNT_1 may be resolved locally only for reimbursement_payment on the approved ExpenseHub portal.', { secret_ref: 'BANK_ACCOUNT_1', destination: 'expensehub_demo' }),
    e(9, 'SECRET_DISCLOSURE_DENIED', 'privacy_kernel', 'Unauthorized disclosure blocked', 'A verification widget requested BANK_ACCOUNT_1 for an unapproved destination. The deterministic kernel denied it.', { secret_ref: 'BANK_ACCOUNT_1', destination: 'verify-now.local', reason: 'origin_not_authorized' }),
    e(10, 'CLAIM_SUBMITTED', 'expensehub', 'ExpenseHub accepted the claim', 'The demo portal returned receipt TRV-2026-91827.', { receipt_id: 'TRV-2026-91827', amount: approvedAmount }),
    e(11, 'SUBMISSION_VERIFIED', 'verifier', 'Portal outcome independently verified', 'Observed receipt, amount, and submitted status match the intended claim state.', { receipt_id: 'TRV-2026-91827', amount: approvedAmount, verified: true }),
    e(12, 'RUN_COMPLETED', 'verifier', 'Verified complete', 'Only the verifier transitioned the run to VERIFIED_COMPLETE.', { final_amount: approvedAmount, raw_secrets_to_model: 0 }),
  ];
}
