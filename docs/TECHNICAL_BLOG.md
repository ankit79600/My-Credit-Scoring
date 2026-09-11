# Building a Decentralized Credit Scoring Protocol on Stellar Soroban

*A step-by-step guide to writing, deploying, and integrating a Rust/Soroban smart contract with a Next.js frontend — including gasless transactions with fee bump.*

---

## Why Decentralized Credit Scoring?

Traditional credit scores are opaque, centralized, and exclusionary. Billions of people worldwide have no credit history precisely because the gatekeepers of credit (banks, bureaus) are the same institutions that extend credit. A decentralized protocol flips this:

- **Permissionless** — anyone can submit a score for any wallet
- **Transparent** — all data is on-chain and publicly auditable
- **Composable** — any dApp can read scores without going through a third party
- **Sybil-resistant** — requiring 3+ independent evaluators before a score is "trusted" makes single-party gaming expensive

This post walks through exactly how we built this on Stellar Soroban.

---

## Architecture Overview

```
Browser (Next.js)
  ↕  HTTPS / Soroban RPC
Soroban RPC Node (soroban-testnet.stellar.org)
  ↕  Ledger reads/writes
Stellar Ledger — Smart Contract (Rust/WASM)
```

The smart contract is the source of truth. The frontend is a thin client that:
1. Reads scores using simulation (no fee, no signature)
2. Submits scores by building, signing, and sending transactions

---

## Part 1: The Soroban Smart Contract

### Data Model

```rust
#[contracttype]
#[derive(Clone)]
pub struct ScoreEntry {
    pub evaluator: Address,
    pub score: u32,       // 0–1000
    pub timestamp: u64,   // ledger close time
}

#[contracttype]
pub enum DataKey {
    Scores(Address),
    Admin,
    LastSubmit(Address, Address), // (user, evaluator)
}
```

We store a `Vec<ScoreEntry>` per user address under `DataKey::Scores(user)`. The `LastSubmit` key tracks the cooldown timestamp per evaluator-user pair.

### Authentication Pattern

Every write function follows the same pattern:

```rust
pub fn submit_score(env: Env, user: Address, score: u32, evaluator: Address) {
    evaluator.require_auth();  // ← Soroban enforces the signature
    assert!(score <= 1000, "score must be 0-1000");
    // ...
}
```

`require_auth()` is Soroban's built-in authentication mechanism. If the transaction does not carry a valid signature from `evaluator`, the call panics and the ledger state is unchanged. This eliminates an entire class of authentication bugs common in EVM contracts.

### Anti-Gaming: The Cooldown

```rust
const COOLDOWN_SECONDS: u64 = 86_400; // 24 hours

let cooldown_key = DataKey::LastSubmit(user.clone(), evaluator.clone());
let last_opt: Option<u64> = env.storage().instance().get(&cooldown_key);
if let Some(last) = last_opt {
    assert!(now >= last + COOLDOWN_SECONDS, "cooldown: wait 24h");
}
```

The timestamp comes from `env.ledger().timestamp()`, which is the consensus-agreed ledger close time. It cannot be manipulated by the transaction submitter.

### Anti-Gaming: The Threshold

The contract exposes two score-reading functions:

```rust
// Always returns the average (even if only 1 evaluator)
pub fn get_average_score(env: Env, user: Address) -> u32 { ... }

// Returns 0 unless at least `min_evaluators` have submitted
pub fn get_average_score_if_threshold(env: Env, user: Address, min_evaluators: u32) -> u32 { ... }
```

The frontend always calls `get_average_score_if_threshold(user, 3)` to determine whether a score is "trusted". A wallet can't game its own score without paying at least 2 other wallets to also submit scores — and even then, those wallets face the 24-hour cooldown before they can update.

### Building and Deploying

```bash
# Install stellar-cli
cargo install stellar-cli --features opt

# Build WASM
cd contract && stellar contract build

# Deploy to testnet
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/contract.wasm \
  --network testnet \
  --source <YOUR_SECRET_KEY>

# Initialize (sets admin)
stellar contract invoke \
  --id <CONTRACT_ID> \
  --network testnet \
  --source <YOUR_SECRET_KEY> \
  -- initialize --admin <YOUR_G_ADDRESS>
```

---

## Part 2: The Next.js Frontend

### Connecting Freighter

Freighter is the browser extension wallet for Stellar. We use `@stellar/freighter-api` v6:

```typescript
import { isConnected, requestAccess, signTransaction } from "@stellar/freighter-api";

export async function connectWallet(): Promise<string> {
  const { isConnected: connected } = await isConnected();
  if (!connected) throw new Error("Install Freighter first");
  const { address, error } = await requestAccess();
  if (error) throw new Error(error);
  return address;
}
```

### Calling the Contract

Soroban transactions have two phases: **simulation** and **submission**. Read-only calls only need simulation — no fee, no signature.

```typescript
import { Contract, TransactionBuilder, Networks, rpc, nativeToScVal, Address } from "@stellar/stellar-sdk";

const server = new rpc.Server("https://soroban-testnet.stellar.org");

async function callContract(method: string, params: xdr.ScVal[], caller: string, sign: boolean) {
  const contract = new Contract(CONTRACT_ADDRESS);
  const account = sign ? await server.getAccount(caller) : new Account(caller, "0");

  const tx = new TransactionBuilder(account, { fee: "100", networkPassphrase: Networks.TESTNET })
    .addOperation(contract.call(method, ...params))
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (!sign) return sim; // read-only: return simulation result

  // Write: assemble, sign with Freighter, submit
  const prepared = rpc.assembleTransaction(tx, sim).build();
  const { signedTxXdr } = await signTransaction(prepared.toXDR(), { networkPassphrase: Networks.TESTNET });
  return server.sendTransaction(TransactionBuilder.fromXDR(signedTxXdr, Networks.TESTNET));
}
```

The key insight: for reads, we use `new Account(caller, "0")` — a dummy account with sequence 0 — so we never need to fetch account data from the network for read-only calls.

---

## Part 3: Fee Sponsorship (Gasless Transactions)

One of the biggest UX barriers in blockchain apps is requiring users to hold native currency (XLM) to pay transaction fees. Stellar's **fee bump** transaction solves this elegantly.

### How Fee Bump Works

A fee bump wraps an existing signed transaction with an outer envelope that pays the fee:

```
Fee Bump Transaction (sponsor pays)
└── Inner Transaction (user signs)
    └── invoke_host_function (submit_score)
```

The user signs only the inner transaction — they never touch XLM. The sponsor account (your backend) signs and submits the outer fee bump.

### Server API Route (Next.js App Router)

```typescript
// app/api/fee-bump/route.ts
import { Keypair, TransactionBuilder, Transaction, Networks, rpc } from "@stellar/stellar-sdk";

export async function POST(req: Request) {
  const { innerXdr } = await req.json();
  const sponsorKeypair = Keypair.fromSecret(process.env.SPONSOR_SECRET_KEY!);
  const innerTx = TransactionBuilder.fromXDR(innerXdr, Networks.TESTNET) as Transaction;

  const feeBump = TransactionBuilder.buildFeeBumpTransaction(
    sponsorKeypair,
    "1000",   // 0.0001 XLM total fee
    innerTx,
    Networks.TESTNET
  );
  feeBump.sign(sponsorKeypair);

  const result = await server.sendTransaction(feeBump);
  return Response.json({ hash: result.hash });
}
```

### Client-Side Gasless Submit

```typescript
export async function submitScoreGasless(caller, user, score, evaluator) {
  // Build + simulate the inner tx
  const tx = new TransactionBuilder(await server.getAccount(caller), { fee: "100", ... })
    .addOperation(contract.call("submit_score", ...))
    .setTimeout(30).build();
  const sim = await server.simulateTransaction(tx);
  const prepared = rpc.assembleTransaction(tx, sim).build();

  // User signs only the inner tx
  const { signedTxXdr } = await signTransaction(prepared.toXDR(), { networkPassphrase: ... });

  // Server pays the fee
  const res = await fetch("/api/fee-bump", {
    method: "POST",
    body: JSON.stringify({ innerXdr: signedTxXdr }),
  });
  const { hash } = await res.json();
  return hash;
}
```

The user experience: click Submit → Freighter popup (sign a transaction with 0 fee) → done. No XLM required.

---

## Part 4: Running Tests

Soroban contracts can be unit-tested in Rust with the `testutils` feature:

```rust
// contract/contracts/contract/src/test.rs
#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::{Address as _, Ledger};
    use soroban_sdk::Env;

    #[test]
    fn test_submit_and_average() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(Contract, ());
        let client = ContractClient::new(&env, &contract_id);

        let user = Address::generate(&env);
        let evaluator = Address::generate(&env);
        client.submit_score(&user, &750, &evaluator);
        assert_eq!(client.get_average_score(&user), 750);
    }
}
```

Run with: `cd contract && cargo test`

---

## Key Takeaways

1. **Soroban's `require_auth()`** is elegant — one line handles all authentication correctly.
2. **Simulation before submission** enables free read-only queries without needing a funded account.
3. **Fee bump transactions** enable gasless UX at the protocol level — no Layer 2 or meta-transaction workaround needed.
4. **Instance storage TTL** must be extended on every write to keep data alive. For production, prefer `persistent` storage.
5. **The 3-evaluator threshold** is a simple but effective anti-Sybil mechanism that doesn't require a ZK circuit.

---

## Resources

- [Stellar Soroban Docs](https://developers.stellar.org/docs/smart-contracts)
- [soroban-sdk crate docs](https://docs.rs/soroban-sdk)
- [Freighter API](https://docs.freighter.app/)
- [This project on GitHub](https://github.com/ankit7960/My-Credit-Scoring)
- [Live App](https://my-credit-scoring-1.vercel.app)

---

*Written by Ankit Patel — Stellar ecosystem developer. Feel free to fork and build on this.*
