import type { RuntimeEvent } from './runtime';

export type RunProjection = {
  status: 'Ready' | 'Running' | 'Verified complete';
  policyRules: number;
  evidenceItems: number;
  rawSecretsToModel: number;
  blockedRequests: number;
  authorizedDisclosures: number;
  conflict?: { invoice: number; paid: number; difference: number };
  receipt?: string;
  amount?: number;
};

export const initialProjection: RunProjection = {
  status: 'Ready',
  policyRules: 0,
  evidenceItems: 0,
  rawSecretsToModel: 0,
  blockedRequests: 0,
  authorizedDisclosures: 0,
};

export function project(events: RuntimeEvent[]): RunProjection {
  const p: RunProjection = { ...initialProjection, status: events.length ? 'Running' : 'Ready' };

  for (const event of events) {
    switch (event.type) {
      case 'DOCUMENTS_HASHED':
        p.evidenceItems = Number(event.data?.documents ?? 0);
        break;
      case 'FACTS_EXTRACTED':
        p.evidenceItems = Math.max(p.evidenceItems, Number(event.data?.facts ?? 0));
        break;
      case 'CONFLICT_DETECTED':
        p.conflict = {
          invoice: Number(event.data?.invoice_amount),
          paid: Number(event.data?.paid_amount),
          difference: Number(event.data?.difference),
        };
        break;
      case 'POLICY_ADJUSTMENT_APPLIED':
        p.policyRules = 11;
        p.amount = Number(event.data?.approved_total);
        break;
      case 'SECRET_DISCLOSURE_ALLOWED':
        p.authorizedDisclosures += 1;
        break;
      case 'SECRET_DISCLOSURE_DENIED':
        p.blockedRequests += 1;
        break;
      case 'CLAIM_SUBMITTED':
        p.receipt = String(event.data?.receipt_id ?? '');
        p.amount = Number(event.data?.amount);
        break;
      case 'RUN_COMPLETED':
        p.status = 'Verified complete';
        p.rawSecretsToModel = Number(event.data?.raw_secrets_to_model ?? 0);
        break;
    }
  }

  return p;
}
