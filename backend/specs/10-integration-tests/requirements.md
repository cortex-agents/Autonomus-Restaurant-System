# Spec: Integration & Multi-Tenant Isolation Tests (Phase 3)

**Build LAST, once modules 01–09 are functioning — this is the acceptance gate before calling the backend done.**

## Goal
Implement the test suites described in `docs/product-spec.md` Section 13, and confirm the whole system meets the load target.

## Requirements

### `tests/test_multitenancy.py`
- Two restaurants with items of the same name and different prices — verify the agent for Restaurant A never returns Restaurant B's price.
- Customer with the same phone number ordering from two different restaurants — verify separate customer records, separate order history, no cross-talk.
- Verify a webhook message tagged with Restaurant A's `phone_number_id` can NEVER trigger a tool call scoped to Restaurant B.
- Verify a JWT issued for Restaurant A cannot read/write Restaurant B's orders, menu, escalations, or settings via any API endpoint.

### `tests/test_order_flow.py`
- Full order flow: browse → add items → confirm → address → payment → finalize.
- Ambiguous item resolution (e.g. "burger" with 3 matches → agent asks which one).
- Order below minimum → agent asks for more items, does not finalize.
- Restaurant closed → agent informs hours, does not take order.
- All escalation triggers fire correctly (complaint, refund, allergy, explicit human request, abusive language, repeated ambiguity).
- Returning customer → saved address offered as a shortcut.

### `tests/test_api.py`
- Every endpoint in `CLAUDE.md` Rule 3 has at least: a happy-path test, an auth-missing test (401), and a cross-tenant test (404/403 as appropriate).

### Load test
- 5 restaurants, 50 concurrent conversations, WhatsApp webhook-to-reply latency under 5 seconds P95 (Section 13).

## Acceptance Criteria
- [ ] All three test files pass
- [ ] Load test meets the P95 target
- [ ] An onboarding runbook exists (`docs/onboarding-runbook.md`): the exact steps to add a new restaurant with zero code changes (insert rows + Meta phone number mapping + create owner login)
