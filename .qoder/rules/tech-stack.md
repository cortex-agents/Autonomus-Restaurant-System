# RULE: Tech Stack (Do Not Substitute)

| Layer | Tech | Notes |
|---|---|---|
| Backend | Python 3.11+, FastAPI | REST API + WhatsApp webhook |
| Agent | Python, OpenAI Agents SDK | Order-taking logic, tools, restaurant-scoped |
| Database | PostgreSQL | Schema is fixed — see docs/product-spec.md Section 7 |
| Queue | Redis Streams | Behind a thin interface, swappable for Kafka later — do NOT introduce Kafka/Kubernetes now |
| Frontend | TypeScript, Next.js (App Router), React | Owner dashboard only |
| Auth | JWT | Scoped to restaurant_id, see multi-tenancy.md |
| Messaging | WhatsApp Business Cloud API (Meta) | REST/JSON over HTTPS |
| Containers | Docker + docker-compose | Single VPS target for MVP |
| Tests | pytest (backend), standard TS test runner (frontend) | |

Rules:
- Backend code is Python only. Frontend code is TypeScript only. Do not mix.
- Do not add new infra (Kafka, Kubernetes, a different DB, a different queue) without it being written into docs/product-spec.md first.
- Backend and frontend only communicate through the endpoints defined in .qoder/rules/api-contract.md. Do not invent new fields or endpoints on either side without updating that file first.
