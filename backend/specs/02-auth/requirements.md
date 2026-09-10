# Spec: Auth (JWT Login)

**Build this SECOND, right after the database schema — every other API depends on it.**

## Goal
Implement owner login and JWT issuance/verification, per `docs/product-spec.md` Section 15.5, and the endpoints in `CLAUDE.md` Rule 3 / Section 7A.

## Requirements
1. `POST /api/auth/login` — accepts `{email, password}`. Looks up the owner account (manually provisioned per restaurant, no self-serve signup), verifies password hash, returns a JWT containing at minimum `restaurant_id` and `exp`.
2. `POST /api/auth/refresh` — issues a new JWT from a still-valid (or short-grace-period-expired) one.
3. Passwords stored hashed (bcrypt or argon2) — never plaintext, never logged.
4. A reusable FastAPI dependency (e.g. `get_current_restaurant`) that:
   - Extracts and verifies the JWT from `Authorization: Bearer <token>`
   - Returns the `restaurant_id` claim
   - Raises 401 on missing/invalid/expired token
5. Every other API endpoint (orders, menu, escalations, settings) must use this dependency — no endpoint should trust a `restaurant_id` passed in the request body or query params.
6. Provide a small CLI/script to manually create an owner account for a restaurant (email + password + restaurant_id), since onboarding is manual in v1.

## Acceptance Criteria
- [ ] Valid login returns a JWT; invalid credentials return a generic 401 (don't reveal whether email or password was wrong)
- [ ] A request to any protected endpoint without a token returns 401
- [ ] A JWT issued for Restaurant A cannot be used to fetch Restaurant B's data (test this explicitly)
- [ ] Expired token is rejected; refresh endpoint issues a valid new one
