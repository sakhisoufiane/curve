# Rate Limiter

Thin wrappers around `express-rate-limit` for use as route middleware. Add new limiters here as named exports when additional endpoints require rate limiting.

---

## mfaRateLimiter

Applied to `POST /authenticate/multi_factor` to prevent brute force attacks against 2FA code submission.

**Configuration**

| Setting | Value |
|---|---|
| Window | 15 minutes |
| Max attempts | 10 per window per user |
| Key | User email extracted from `req.body.token` via `jwt.decode` |
| Store | In-memory (default) |
| Response on breach | `429` — `{ message: 'Too many attempts, please try again later.' }` |

**Why 15 minutes**

The MFA email code JWT is signed with `expiresIn: 900` (15 minutes). Aligning the rate limit window with the code TTL means both expire together — a locked-out user simply restarts the login flow and gets a fresh code.

**Why `jwt.decode` not `jwt.verify`**

The `keyGenerator` only needs the email to bucket the request. Using `decode` (no signature verification) means tampered or expired tokens still get rate limited rather than bypassing the limiter. Actual token verification happens inside the route handler as normal.

**Why `skip` when no token**

If `req.body.token` is absent the limiter is skipped entirely. The route already rejects these requests with a `403`, so there is nothing to rate limit — an attacker without a valid MFA token can never reach the code comparison logic.

**Known limitation**

Uses the default in-memory store, so each ECS instance maintains its own counter. An attacker could theoretically get 10 attempts per instance. A distributed store (Redis or MongoDB-backed) should be considered as a follow-up if this becomes a concern.

**Added in**

CUR-5635 — pen test finding, April 2026.
