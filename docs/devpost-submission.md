# ContextFlow — Devpost Submission Draft

## Track

**Professional Agents**

## One-line pitch

ContextFlow is a privacy-preserving reimbursement agent that verifies evidence, enforces company policy, and completes browser workflows end to end without giving the reasoning model unrestricted access to protected employee data.

## What it does

A finance or operations user starts with a reimbursement request, policy, and supporting evidence. ContextFlow uses a Strands Agent to reason over a sanitized claim state and choose tools, while deterministic components establish fact provenance, enforce reimbursement rules, authorize secret disclosure, execute browser actions, and verify the final portal outcome.

The demo intentionally includes a ₹180 contradiction: the hotel invoice says ₹8,420 but proof of payment shows ₹8,240. A deterministic reimbursement rule caps the hotel claim at the verified amount paid, resulting in a final claim of ₹26,990.

When ExpenseHub asks for the employee's bank account and IFSC, Strands sees opaque references such as `BANK_ACCOUNT_1`. A Chrome MV3 extension stores the corresponding demo secrets locally. The Privacy Kernel releases a secret only when the portal, target origin, purpose, operation, and capability all match.

An untrusted third-party widget then asks for the bank account at `https://verify-now.local`. Even if an agent were persuaded to make that request, the deterministic kernel denies it because the target origin is outside the approved capability. The model never receives the raw value.

Finally, ExpenseHub returns a receipt. ContextFlow does not trust a click or an agent statement as proof of success. A separate verifier reads the resulting portal state and checks the receipt ID, amount, and status before the run can become `VERIFIED_COMPLETE`.

## Who it is for

Finance, operations, HR, and administrative teams that repeatedly process evidence-heavy expense and reimbursement workflows.

## Why it matters

These workflows combine repetitive browser work with judgment-heavy policy interpretation and sensitive employee data. Conventional RPA is brittle on changing interfaces, while unconstrained browser agents can over-share private context. ContextFlow combines semantic agent planning with deterministic authority boundaries so teams can automate more of the workflow without asking the model to be its own security policy.

## How Strands is used

The backend is a real Strands Agents implementation built around `Agent` and custom `@tool` functions. The agent can:

- inspect a sanitized evidence ledger;
- invoke deterministic reimbursement-policy evaluation;
- request narrowly scoped secret capabilities using opaque references;
- invoke independent receipt verification.

Strands owns reasoning and orchestration. It does not own evidence truth, raw secret access, disclosure authorization, or final completion state.

## 5-minute video structure

**0:00–0:25 — Problem + user**  
"Finance teams repeatedly reconcile documents, policy, portals, and sensitive employee data. Browser agents can automate the clicks, but giving the same model raw secrets and untrusted page instructions creates a dangerous authority problem."

**0:25–0:45 — Product**  
Open ContextFlow. Show Maya's conference reimbursement and explain that the agent will complete one workflow end to end.

**0:45–1:25 — Evidence + policy**  
Start the run. Show document fingerprints, extracted facts, the ₹8,420 vs ₹8,240 conflict, and deterministic adjustment to ₹26,990. Show Strands `PLAN_READY` only after the real backend invocation succeeds.

**1:25–2:25 — Browser execution**  
Open ExpenseHub with the extension loaded. Show the Privacy Kernel connected. Capture a semantic snapshot and fill `BANK_ACCOUNT_1` / `IFSC_1` locally. Explain that the model sees references, not raw values.

**2:25–3:20 — Adversarial moment**  
Trigger the untrusted `verify-now.local` widget. Show the request reach the Privacy Kernel and return `target_origin_not_authorized`. Open Mission Control and show the real blocked runtime event.

**3:20–4:10 — Submit + verify**  
Submit the claim. Show receipt `TRV-2026-91827`, amount ₹26,990, then the independent verifier event and `VERIFIED_COMPLETE` state.

**4:10–4:45 — Architecture**  
Show the architecture diagram: Strands reasons; Evidence Ledger establishes facts; policy/privacy kernels grant authority; extension executes; verifier proves the outcome.

**4:45–5:00 — Close**  
"ContextFlow doesn't ask you to trust the agent. It limits what the agent is capable of doing — then verifies what actually happened."

## Judge testing instructions

1. Clone the public repository.
2. Start `apps/web` using the README instructions.
3. Start `apps/api` with AWS credentials and an enabled Bedrock model.
4. Set `CONTEXTFLOW_AGENT_API_URL=http://127.0.0.1:8000` for the Next.js server if required.
5. Load the unpacked `extension/` directory in Chrome.
6. On Overview, run evidence + Strands planning and confirm `STRANDS CONNECTED`.
7. Open ExpenseHub. Confirm `PRIVACY KERNEL CONNECTED`.
8. Authorize protected fields. Confirm both fields are filled locally.
9. Trigger the third-party verification widget. Expected result: `BLOCKED`, reason `target_origin_not_authorized`.
10. Submit the claim and open Mission Control. Expected final state: `VERIFIED COMPLETE`, receipt `TRV-2026-91827`, amount `₹26,990`, raw secrets to model `0`.

## Required items still external to the repository

- Public YouTube/Vimeo video ≤ 5 minutes.
- AWS Builder ID entered in Devpost.
- Optional public live demo URL (recommended for Technical Implementation score).
- Devpost submission fields completed before the deadline.
