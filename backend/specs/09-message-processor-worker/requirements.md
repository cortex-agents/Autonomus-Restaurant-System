# Spec: Message Processor (Queue Consumer)

**Build after 01 through 07 exist — this wires everything together into the actual running pipeline.**

## Goal
Implement the Redis Streams consumer that turns an inbound WhatsApp message into an agent-run, per `docs/product-spec.md` Section 11.

## Requirements
Exact pipeline, in order, per message pulled off the queue:
1. Resolve `restaurant_id` from `phone_number_id` (see 03-whatsapp-webhook).
2. Resolve or create the `customers` row, scoped to `restaurant_id` + phone (see Section 7 unique constraint).
3. Get or create the active `conversations` row for this customer.
4. Store the inbound message in `messages`.
5. Load the restaurant's menu + settings (current values, per 08-settings-api note on no caching) and render the system prompt (04-agent-tools, Section 9).
6. Run the agent with the restaurant-scoped tools (04-agent-tools).
7. Store the outbound message in `messages`.
8. Send the reply via WhatsApp (03-whatsapp-webhook's `WhatsAppHandler.send_message`).
9. If an order was finalized, push it to the dashboard (i.e. it's now visible via 05-orders-api) and notify the owner per Section 12.
10. If escalated, create the escalation record (07-escalations-api) and alert the owner immediately.

Failure handling (Section 15.6, must all be implemented here):
- Two messages from the same customer within 2 seconds: process sequentially using a per-`conversation_id` lock — never in parallel, to avoid cart race conditions.
- Agent/LLM call fails or times out (>10s): send the customer the fallback message ("Thori dair lag rahi hai, ek minute mein wapas aata hoon"), retry once, escalate if it fails again.
- Database connection lost: message stays in the Redis queue until acknowledged — must not be lost.
- Customer sends an image: reply with the out-of-scope message from Section 15.6, don't pass it to the agent as if it were text.

## Acceptance Criteria
- [ ] End-to-end: a WhatsApp message in → correct restaurant resolved → agent runs → reply sent → all rows written correctly
- [ ] Two rapid messages from the same customer are processed in order, not concurrently, with no cart corruption
- [ ] Simulated LLM timeout triggers the fallback message and retry-then-escalate behavior
- [ ] An in-flight message survives a worker restart (still in Redis, gets reprocessed)
- [ ] Load test: 5 restaurants, 50 concurrent conversations, webhook-to-reply P95 latency under 5 seconds (Section 13)
