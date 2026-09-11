# Security Review — Credit Scoring Smart Contract

**Contract:** `CAHR6ZKV2N7U5UMU3HQICGMNZ37YRNAXATPXQTOOPYION3RORD6C2WNR` (Testnet)  
**Language:** Rust / Soroban SDK  
**Review Date:** September 2026  
**Reviewer:** Ankit Patel  
**Scope:** `contract/contracts/contract/src/lib.rs` (232 lines)

---

## Executive Summary

The contract is a permissionless, on-chain credit scoring protocol. It stores evaluator-submitted scores per user wallet and computes weighted averages on demand. The overall security posture is **good**: authentication is enforced on every write, input ranges are validated, and an anti-gaming cooldown prevents rapid score manipulation. One medium-severity finding (instance storage expiry) and several low/informational items are noted below.

**Overall Risk Rating: LOW–MEDIUM**

---

## Findings

### 1. Storage Expiry — Medium Severity

**Location:** All write functions (`submit_score`, `remove_score`, `initialize`)

**Description:**  
All data is stored in `env.storage().instance()`, which has a time-to-live (TTL). The contract extends the TTL (`extend_ttl(518_400, 1_555_200)`) on every write, keeping data alive for up to ~90 days after the last interaction. However, if a user's wallet receives no new score submissions for 90 days, their score data is silently deleted from the ledger.

**Impact:**  
Users who have not been evaluated recently lose their entire score history with no warning. This is a protocol-level data loss risk, not a traditional security vulnerability, but it can confuse users and erode trust.

**Recommendation:**  
- Migrate score entries from instance storage to persistent storage (`env.storage().persistent()`), which survives indefinitely and is only purged after a much longer grace period.
- If instance storage is kept for cost reasons, add a `bump_ttl(user: Address)` function that anyone can call to extend a user's TTL.

**Status:** Informational for testnet; must be resolved before mainnet production deployment.

---

### 2. Self-Evaluation Allowed — Low Severity

**Location:** `submit_score`

**Description:**  
Nothing prevents `user == evaluator`. A wallet can give itself an arbitrarily high score. The 3-evaluator anti-gaming threshold (enforced client-side via `get_average_score_if_threshold`) mitigates this for trusted scores, but self-evaluations still appear in the raw score list.

**Recommendation:**  
Add an assertion: `assert!(user != evaluator, "cannot self-evaluate")`. This eliminates a class of spam submissions.

**Status:** Low priority for testnet; recommended for mainnet.

---

### 3. Admin Key Compromise — Low Severity

**Location:** `initialize`, `upgrade`

**Description:**  
The admin account controls contract upgrades. If the admin private key is compromised, an attacker can deploy arbitrary WASM to the contract address, replacing all logic. There is currently no multi-sig or time-lock on the upgrade path.

**Recommendation:**  
- Use a multi-sig Stellar account as admin (2-of-3 signers).
- Consider adding a time-lock delay to upgrades so the community has time to react.
- Publish the admin address publicly so it can be monitored.

**Status:** Low risk on testnet (contract is not value-bearing). High priority before mainnet.

---

### 4. Score Range Validated — PASS

`assert!(score <= 1000)` correctly bounds all inputs. Off-by-one (score = 1000 allowed as intended) and underflow (u32 cannot go negative) are non-issues.

---

### 5. Evaluator Authentication — PASS

`evaluator.require_auth()` is called before any state mutation in `submit_score` and `remove_score`. This correctly prevents third-party wallets from submitting or revoking scores on behalf of others without a valid signature.

---

### 6. Cooldown Mechanism — PASS

A 24-hour (`86_400` second) cooldown is enforced per `(user, evaluator)` pair using ledger timestamps. The timestamp is sourced from `env.ledger().timestamp()`, which is the ledger close time and cannot be manipulated by the transaction submitter.

---

### 7. Initialization Guard — PASS

`initialize` checks `!env.storage().instance().has(&DataKey::Admin)` before proceeding, preventing re-initialization. The admin must co-sign, preventing front-running by an attacker who might try to claim admin before the deployer.

---

### 8. No Reentrancy Risk — PASS

Soroban contracts do not share a call stack the way EVM contracts do. Cross-contract calls are explicit and the credit scoring contract makes none, so reentrancy is not a concern.

---

### 9. No Integer Overflow — PASS

The `get_average_score` sum uses `u64` accumulation before dividing by the evaluator count, avoiding overflow even if 1,000 evaluators each submit the maximum score of 1,000 (max sum = 1,000,000 which fits comfortably in `u64`).

---

## Checklist

| Check | Result |
|---|---|
| All write functions require authentication | ✅ Pass |
| Input range validation | ✅ Pass |
| Reentrancy | ✅ N/A (no cross-contract calls) |
| Integer overflow | ✅ Pass |
| Self-evaluation prevention | ⚠️ Not enforced (Low) |
| Rate limiting / cooldown | ✅ Pass |
| Initialization protection | ✅ Pass |
| Upgrade access control | ✅ Pass (single admin) |
| Persistent storage (mainnet) | ⚠️ Use persistent storage (Medium) |
| Admin multi-sig | ⚠️ Recommended before mainnet |

---

## Recommendations Summary

| Priority | Item |
|---|---|
| **High (pre-mainnet)** | Migrate to `env.storage().persistent()` to prevent data expiry |
| **High (pre-mainnet)** | Use a multi-sig account as admin |
| **Medium** | Block self-evaluation with `assert!(user != evaluator)` |
| **Low** | Add a `bump_ttl` utility function |
| **Informational** | Add an event log (via `env.events().publish`) for off-chain indexing |

---

## Conclusion

The contract follows Soroban best practices for authentication and input validation. The primary concern before mainnet launch is switching from instance storage to persistent storage to guarantee score data survives without active re-evaluation. The admin upgrade path should also be secured with multi-sig before value-bearing transactions are processed on mainnet.
