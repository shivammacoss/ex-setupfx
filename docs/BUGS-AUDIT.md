# Platform Audit — Bug Triage

Generated 2026-05-09 by 4 parallel review agents covering Auth/KYC/Wallet,
Trading Engine, PAMM/Copy/IB, and Admin/cross-cutting concerns.

This file lists **verified concrete bugs** plus claims that need owner review.
Each item has severity + source file + recommended fix direction.

Status legend: ✅ fixed in this commit · ⚠️ verify before fixing · 📋 needs design

---

## ✅ Fixed in this commit

| # | File | Issue | Severity |
|---|---|---|---|
| 1 | `admin/services/trade_service.py:404` | Admin-closed positions stamped `close_reason='manual'`; should be `'admin'` so trader history badge distinguishes them | HIGH |
| 2 | `gateway/src/services/auth_service.py:267` | New user's IBProfile `parent_ib_id` was never set on registration → MLM L2+ commission chain broken; now creates profile with `parent_ib_id` linked to referrer | HIGH |
| 3 | `admin/services/deposit_service.py:136` | Concurrent `approve_deposit` calls could both pass the `status='pending'` check and double-credit balance + bonus; added `SELECT ... FOR UPDATE` row lock on Deposit + User | HIGH |

---

## ⚠️ Confirmed bugs — pending fix (real, need design call)

### Wallet / Payments
- **withdraw approval double-balance**: balance deducted at user-submit AND at admin-approve in some paths → if user submits two ≤balance withdrawals concurrently both go pending; admin approves both → over-withdrawal. Fix: deduct at submit, restore on reject (already partially this way — needs audit + lock).
- **OxaPay webhook replay**: handler doesn't store seen `payment_id` in a dedup set. Duplicate webhook can re-trigger flow. Fix: insert `oxapay_id` into a unique-constrained processed-payments table before crediting.
- **OxaPay HMAC empty-key bypass**: if `OXAPAY_MERCHANT_KEY=""` (sandbox), `hmac.compare_digest("", "")` passes — accept unsigned webhooks. Fix: explicit `if not key: return 401` guard before compare.
- **Bonus same-deposit duplicate**: bonus offer applied per-`approve_deposit` call. Idempotency now guarded by deposit row lock (this commit) — verify no other path triggers bonus.

### Trading
- **Stale market price**: `trading_service.py` reads tick from Redis with no `STALE_TICK_AFTER_SEC` enforcement. Risk of fills on stale prices. Fix: reject if `now - tick.ts > 30s`.
- **Margin pre-flight not atomic**: free_margin check + position INSERT are 2 statements. Concurrent orders bypass cap. Fix: `SELECT ... FOR UPDATE` on `trading_accounts` row before INSERT.
- **SL/TP pick-twice race**: two engine ticks 1s apart can both load the same position. Mitigated by `await db.commit()` per-position (recently added) but not bulletproof. Fix: `WHERE status='open'` + `RETURNING` in atomic UPDATE.

### PAMM / Copy / IB
- **PAMM master_investors NULL crash**: `social_service.py` joins `InvestorAllocation.investor_account_id` to `TradingAccount` with INNER JOIN; PAMM allocations have NULL → no investors visible AND `account.account_number` access throws. Fix: LEFT JOIN + null-safe accessors.
- **PAMM profit distribution missing**: `distribute_pamm_profit` referenced in comment but not implemented. Master closes a trade, profit sits in pool, investors' `total_profit` never accrues, withdrawal returns wrong NAV. Fix: implement on `_close_position` for PAMM master accounts: pro-rate by share %, deduct performance fee, update each `InvestorAllocation`.
- **Copy engine PAMM skip**: `copy_engine.py:259` explicitly `continue`s on PAMM type, so PAMM trades never mirror to investors. Architectural — PAMM should use distribute_pamm_profit (above), not mirror.
- **IB commission marked paid but no payout**: `ib_engine.py:124` sets `status='paid'` immediately. No admin endpoint to actually pay out from main_wallet. Fix: change default to `'pending'`, add admin payout endpoint that credits user main_wallet + flips status.
- **PAMM withdrawal stale total_alloc**: NAV calc uses `total_alloc` snapshot from before withdrawal commit → remaining investors' shares momentarily inflated. Fix: re-query after delete.

### Admin
- **Impersonation no logout / revert**: `login_as_user` mints token, but no record of who impersonated when, no force-logout when admin "exits" — token expiry only. Fix: add `audit_log` row on impersonate, add `/admin/users/{id}/end-impersonation` that revokes the token via blacklist.
- **Password change keeps sessions**: changing password (admin or user) doesn't invalidate `user_refresh_tokens`. Fix: `DELETE FROM user_refresh_tokens WHERE user_id=:id` on password change.
- **WebSocket auth optional**: `/ws/prices` can be subscribed without token. OK for public price feed, NOT OK for `/ws/positions` (account-scoped). Verify position WS requires auth + filters by account ownership.
- **AuditLog has no tenant_id**: in multi-tenant prod, admin can `SELECT * FROM audit_logs` across tenants. We dropped NOT NULL on tenant columns earlier — need application-level tenant filter on all admin queries.

### KYC
- **Doc admin access scoping**: `kyc_service.get_kyc_file()` no `user_id` ownership check on admin side. By design (admin sees all), but tenant scoping should still apply. Verify.

---

## 📋 Architectural / non-blocking

- **TOTP secret unencrypted**: stored as plaintext String(255). On DB compromise, all 2FA tokens leak. Fix: encrypt at rest with app-level key derived from `JWT_SECRET` or KMS.
- **Rate limiting no-op**: `rate_limit_http()` is currently a stub. Wire it to `slowapi` or Redis-backed limiter.
- **Three JWT secrets unused**: `USER_JWT_SECRET` and `ADMIN_JWT_SECRET` defined but `auth.py` only uses `JWT_SECRET`. Either remove the unused secrets or actually use them for token-type isolation.
- **Settings cache stale**: admin updates `allow_deposits` in Redis db1, gateway reads from cache that may lag. Add pubsub invalidation.

---

## ❌ Agent claims that are FALSE on review

- **"SL/TP sell-side inverted"**: agent claimed `ask >= sl` is wrong for sell. **It's correct** — sell positions close on ASK (you pay ask to buy back); price rising against you means ask reaches SL.
- **"Stop-out closes losers first is wrong"**: industry standard (MT5) closes the *most-loss* position first to free margin. Sorted by profit ascending = correct.
- **"Swap applied backward"**: `account.balance += swap_amount` is correct if `swap_amount` is signed (negative for short positions, etc.). Need to verify swap-amount sign convention before "fixing".

---

## How to use this doc

For each ⚠️ item:
1. Reproduce locally with the reported scenario
2. Decide fix scope (code / migration / config)
3. Open small PR per item — don't bundle 5 fixes in one commit
4. Update this file: move from ⚠️ to ✅ with PR link

For 📋 items: schedule as roadmap, not urgent fixes.
