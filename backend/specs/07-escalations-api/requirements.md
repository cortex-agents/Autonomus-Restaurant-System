# Spec: Escalations API

**Build after 02-auth, 01-database-schema, and 04-agent-tools (which creates escalation records).**

## Goal
Implement the escalations REST endpoints for the owner dashboard, per `CLAUDE.md` Rule 3 / `docs/product-spec.md` Section 7A, backed by the `escalations` and `conversations` tables (Section 7).

## Requirements
1. `GET /api/escalations` — list escalations for the authenticated restaurant, filterable by status (`open`, `acknowledged`, `resolved`).
2. `GET /api/escalations/{id}` — detail view including the reason and the full conversation transcript (join to `conversations` / `messages`) so the human has full context (Section 12: "full context and a reply box").
3. `POST /api/escalations/{id}/reply` — sends a human-authored reply back to the customer via WhatsApp (reuses the `WhatsAppHandler.send_message` from 03-whatsapp-webhook, using the correct restaurant's `phone_number_id`), and stores it as an outbound message in `messages`.
4. `PATCH /api/escalations/{id}/resolve` — marks resolved, sets `resolved_at`.
5. When an escalation is newly created (by the agent, in 04-agent-tools), the owner must be alerted immediately per Section 12's decision: WhatsApp alert to the owner's personal number (recommended default) — implement this as a side effect of escalation creation, not something the dashboard polls for.

## Acceptance Criteria
- [ ] Escalation list/detail/reply/resolve all scoped to the calling restaurant
- [ ] Replying via the API actually sends a WhatsApp message to the customer and appears in the conversation transcript
- [ ] New escalation triggers an immediate owner WhatsApp alert (per Section 12)
- [ ] Conversation context in the detail view includes prior order-taking messages, not just the escalation trigger message
