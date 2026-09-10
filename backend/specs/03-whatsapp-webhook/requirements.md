# Spec: WhatsApp Webhook + Send

**Paste this whole file into a Qoder Quest task with the Spec toggle ON. Depends on 01-database-schema being done first.**

## Goal
Build the FastAPI webhook that receives WhatsApp messages from Meta Cloud API and the client that sends replies, per `docs/product-spec.md` Section 10.

## Requirements
1. `GET /webhooks/whatsapp` — Meta verification handshake (echoes `hub.challenge` when `hub.verify_token` matches `WHATSAPP_WEBHOOK_VERIFY_TOKEN`).
2. `POST /webhooks/whatsapp` — receives inbound messages, parses payload into normalized shape: `{phone_number_id, from, whatsapp_message_id, content, timestamp}`.
3. Resolve `restaurant_id` from `phone_number_id` (never trust any restaurant identifier from the payload body itself) — see `.qoder/rules/multi-tenancy.md`.
4. Push each normalized message onto the Redis Streams queue (behind the thin queue interface from `.qoder/rules/tech-stack.md`) — do not process it synchronously in the webhook handler.
5. `WhatsAppHandler.send_message(phone_number_id, to, body)` — sends a text reply via Meta Cloud API using the correct restaurant's `phone_number_id`.
6. Retry-with-backoff on send failure per `docs/product-spec.md` Section 15.6 (3x exponential backoff, then log to escalations + alert dashboard).

## Acceptance Criteria
- [ ] Meta's verification GET request succeeds
- [ ] A test POST payload for Restaurant A never resolves to Restaurant B's restaurant_id
- [ ] Failed sends are retried 3x then escalated, not silently dropped
- [ ] Webhook handler returns fast (message goes to queue, not processed inline)
