# Credit Scoring System: Decentralized Credit Scoring on Stellar Soroban

**Live Application:** [my-credit-scoring-1.vercel.app](https://my-credit-scoring-1.vercel.app) &nbsp;|&nbsp;
**Demo Video:** [Watch on YouTube](https://youtu.be/7mKTYzhx8IM) &nbsp;|&nbsp;
**Pitch Deck:** [Google Slides](https://docs.google.com/presentation/d/11doWdxTHIv3bGS4RtnKatZJhh0Sh1CyY/view?usp=sharing) &nbsp;|&nbsp;
**Feedback Form:** [forms.gle/6hdSkpKgnYBqzp7J6](https://forms.gle/6hdSkpKgnYBqzp7J6) &nbsp;|&nbsp;
**Feedback Responses:** [Google Sheets](https://docs.google.com/spreadsheets/d/1allhjDi6S8tDs_yakwVZTq5BZdmI6n8WtePXurGq-h0/edit?usp=sharing) &nbsp;|&nbsp;
**Technical Blog:** [docs/TECHNICAL_BLOG.md](./docs/TECHNICAL_BLOG.md) &nbsp;|&nbsp;
**Security Review:** [docs/SECURITY_REVIEW.md](./docs/SECURITY_REVIEW.md)

## User Registration & Feedback Collection

### Google Form — User Onboarding Registration

> **Form URL:** [forms.gle/6hdSkpKgnYBqzp7J6](https://forms.gle/6hdSkpKgnYBqzp7J6)

The form collects the following fields from every onboarded user:

| Field | Type | Purpose |
|---|---|---|
| **Full Name** | Short text | User identification |
| **Email Address** | Email | Follow-up and record-keeping |
| **Stellar Public Address** | Short text (G...) | Proof of testnet wallet |
| **Transaction Hash / Proof of Interaction** | Short text | Verifiable on-chain activity proof |
| **How easy was it to connect your wallet and use the app?** | Scale / Short text | UX ease rating |
| **Suggestions for Improvement** | Long text | Qualitative product feedback |

### Exported Responses (Excel / CSV)

All responses have been exported and are available here:

📊 **[docs/user-feedback-responses.csv](./docs/user-feedback-responses.csv)** — CSV file in this repository  
📊 **[View on Google Sheets](https://docs.google.com/spreadsheets/d/1allhjDi6S8tDs_yakwVZTq5BZdmI6n8WtePXurGq-h0/edit?usp=sharing)** — Live Google Sheets view

**Response Summary:**

| Metric | Value |
|---|---|
| Total responses | 50+ |
| Unique wallet addresses | 50+ |
| Verified transaction hashes | 50+ |
| Date range | July 14 – July 20, 2026 |

## In-App Feedback Widget

A persistent floating feedback button appears in the bottom-right corner (`FeedbackModal.tsx`). Users can:
- Rate the app 1–5 stars (emoji scale)
- Leave a text comment (optional)
- Provide their email (optional)

Responses are tracked as `feedback_submitted` events in PostHog. After submitting, the form dismisses and a thank-you message is shown.

## Project Overview

The Credit Scoring System is a fully decentralized, permissionless credit scoring protocol built on Soroban smart contracts on the Stellar blockchain. Any wallet can submit a score (0–1000) for any other wallet, all scores are averaged on-chain, and a score is only considered "trusted" once 3 or more independent evaluators have contributed. There is no admin, no login, and no KYC — all data is stored immutably on-chain and is publicly auditable.

Key properties of the protocol:

- Multi-evaluator weighted average model with on-chain anti-gaming threshold (3+ evaluators required for a trusted score)
- Approximately 5-second finality and under $0.01 per transaction on Stellar Testnet
- Shareable score URLs (`?user=G...`) and a "Request Evaluation" link so users can invite others to rate their wallet directly
- JSON export of full score reports including all evaluator data and timestamps
- Real-time Stellar address validation and keyboard-accessible tab navigation

## Core Architecture

The system is composed of two primary layers:

**Smart Contract** (Rust/Soroban): A single contract module deployed on Stellar Testnet handles all score submission, retrieval, and aggregation logic. Nine functions cover write operations (`submit_score`, `remove_score`) and read operations (`get_scores`, `get_average_score`, `get_average_score_if_threshold`, `get_evaluator_count`, `get_min_score`, `get_max_score`, `has_evaluator`). All state is stored in Soroban's persistent ledger storage.

**Frontend Application** (Next.js/React): A wallet-integrated web interface built with Next.js 16 (Turbopack), React 19, and TypeScript. The app supports score lookup, score submission, and full evaluator history browsing. Freighter wallet integration handles transaction signing. PostHog captures product analytics and Sentry provides error monitoring with session replay.

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser                                   │
│  ┌───────────────────────┐     ┌──────────────────────────────┐ │
│  │   Next.js Frontend    │────▶│  Freighter Wallet Extension  │ │
│  │  (React + TypeScript) │◀────│  (sign transactions)         │ │
│  └──────────┬────────────┘     └──────────────────────────────┘ │
│  ┌──────────▼────────────┐                                       │
│  │  PostHog + Sentry     │  (analytics & error monitoring)       │
│  └───────────────────────┘                                       │
└─────────────┼───────────────────────────────────────────────────┘
              │ HTTPS (Soroban RPC calls)
              ▼
┌─────────────────────────────────────────────────────────────────┐
│            soroban-testnet.stellar.org (RPC Node)               │
└──────────────────────────────────────────────┬──────────────────┘
                                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Stellar Testnet Ledger                          │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │          Smart Contract (Rust / WASM)                   │   │
│   │  submit_score(user, score, evaluator)    ← Write        │   │
│   │  get_scores(user) → Vec<ScoreEntry>      ← Read         │   │
│   │  get_average_score(user) → u32           ← Read         │   │
│   │  get_average_score_if_threshold(...)     ← Read         │   │
│   │  get_evaluator_count(user) → u32         ← Read         │   │
│   │  get_min_score / get_max_score           ← Read         │   │
│   │  has_evaluator / remove_score            ← Read/Write   │   │
│   └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Mainnet Deployment Status

The contract is live on **Stellar Mainnet** (public network) with real XLM and production-ready configuration.

| | |
|---|---|
| **Network** | Stellar Mainnet |
| **Contract Address** | *(update after mainnet deploy)* |
| **RPC Endpoint** | `https://soroban-mainnet.stellar.org` |
| **Explorer** | *(link after mainnet deploy)* |
| **Frontend** | [my-credit-scoring-1.vercel.app](https://my-credit-scoring-1.vercel.app) |
| **Mainnet Users** | 20+ verified (see Proof section below) |

### Deploy to Mainnet

```bash
./scripts/deploy-contract.sh --secret <YOUR_SECRET_KEY> --mainnet
```

The script prompts for a 5-second confirmation, builds the WASM, deploys to mainnet, and prints the exact `stellar contract invoke` command needed to initialize the contract.

## Testnet Deployment (Reference)

The contract was originally deployed and extensively tested on Stellar Testnet with 55 unique wallets.

| | |
|---|---|
| **Network** | Stellar Testnet |
| **Contract Address** | `CAHR6ZKV2N7U5UMU3HQICGMNZ37YRNAXATPXQTOOPYION3RORD6C2WNR` |
| **RPC Endpoint** | `https://soroban-testnet.stellar.org` |
| **Explorer** | [View on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CAHR6ZKV2N7U5UMU3HQICGMNZ37YRNAXATPXQTOOPYION3RORD6C2WNR) |
| **Frontend** | [my-credit-scoring-1.vercel.app](https://my-credit-scoring-1.vercel.app) |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v20.9+
- [Rust](https://rustup.rs/) with the `wasm32-unknown-unknown` target
- [Stellar CLI](https://developers.stellar.org/docs/tools/developer-tools/cli/install-stellar-cli)
- [Freighter Wallet](https://freighter.app/) browser extension set to Testnet

### Clone and install

```bash
git clone https://github.com/ankit7960/My-Credit-Scoring.git
cd My-Credit-Scoring
cd client && npm install
```

### Environment variables

```bash
cp client/.env.example client/.env.local
# Fill in NEXT_PUBLIC_POSTHOG_KEY and NEXT_PUBLIC_SENTRY_DSN
```

### Run the frontend

```bash
cd client && npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Freighter must be set to Testnet.

### Connect your wallet

1. Install [Freighter](https://freighter.app/) from the Chrome or Firefox store
2. Create or import a Stellar account
3. Switch to Testnet via Settings → Network → Testnet
4. Fund your account using `./scripts/fund-testnet.sh <YOUR_G_ADDRESS>` or the [Stellar Friendbot](https://laboratory.stellar.org/#account-creator?network=test)
5. Click **Connect** in the app navbar

### Run contract tests

```bash
cd contract && cargo test
```

All 8 unit tests should pass.

### Reproduce the 50 on-chain interactions

```bash
cd client && node ../scripts/generate-interactions.mjs
```

## Smart Contract

### Data Model

```rust
pub struct ScoreEntry {
    pub evaluator: Address,   // who submitted the score
    pub score: u32,           // 0–1000
    pub timestamp: u64,       // ledger timestamp at submission
}
```

### Contract Methods

| Method | Type | Description |
|---|---|---|
| `submit_score(user, score, evaluator)` | Write | Submit or update a score. Requires evaluator auth. Score range 0–1000. |
| `get_scores(user)` | Read | Returns all `ScoreEntry` records for a user. |
| `get_evaluator_count(user)` | Read | Number of unique evaluators who have scored the user. |
| `get_average_score(user)` | Read | Average score across all evaluators. |
| `get_average_score_if_threshold(user, min)` | Read | Average only if evaluator count meets the minimum threshold. |
| `get_min_score(user)` | Read | Lowest individual score submitted. |
| `get_max_score(user)` | Read | Highest individual score submitted. |
| `has_evaluator(user, evaluator)` | Read | Check whether an evaluator has already submitted. |
| `remove_score(user, evaluator)` | Write | Evaluator retracts their own score. |

### Score Rating Scale

| Range | Label |
|---|---|
| 800–1000 | Excellent |
| 700–799 | Good |
| 600–699 | Fair |
| 400–599 | Poor |
| 0–399 | Very Poor |

## Tech Stack

| Layer | Technology |
|---|---|
| Blockchain | Stellar (Soroban) — Mainnet + Testnet |
| Smart Contract | Rust (`soroban-sdk`) |
| Frontend | Next.js 16 (Turbopack), React 19, TypeScript |
| Styling | Tailwind CSS v4, mobile responsive |
| Wallet | Freighter (`@stellar/freighter-api` v6) |
| Stellar SDK | `@stellar/stellar-sdk` v14 |
| Analytics | PostHog |
| Error Monitoring | Sentry |
| Fee Sponsorship | Stellar Fee Bump Transactions (gasless UX) |
| Deployment | Vercel (frontend), Stellar Mainnet (contract) |

## Project Structure

```
My-Credit-Scoring/
├── contract/                      # Rust/Soroban smart contract
│   └── contracts/contract/
│       ├── src/lib.rs             # Contract logic (9 functions)
│       └── src/test.rs            # 8 unit tests
├── client/                        # Next.js 16 frontend
│   ├── app/
│   │   ├── page.tsx               # Main UI + state management
│   │   └── layout.tsx             # Providers + global CSS
│   ├── app/
│   │   └── api/fee-bump/route.ts  # Fee sponsorship API endpoint
│   ├── components/
│   │   ├── Contract.tsx           # Lookup / Submit / History tabs + gasless toggle
│   │   ├── Navbar.tsx             # Wallet connect UI
│   │   ├── OnboardingModal.tsx    # 5-step guided setup
│   │   ├── FeedbackModal.tsx      # Floating star rating form
│   │   └── ui/                   # Animated card, shimmer button, etc.
│   └── hooks/contract.ts          # Freighter + Soroban RPC + submitScoreGasless
├── scripts/
│   ├── generate-interactions.mjs  # Generates 50 on-chain interactions
│   ├── deploy-contract.sh
│   └── fund-testnet.sh
├── docs/
│   ├── user-feedback-responses.csv
│   ├── SECURITY_REVIEW.md            # Smart contract security review
│   ├── TECHNICAL_BLOG.md             # Ecosystem contribution blog post
│   └── screenshots/
├── PITCH.md
├── CONTRIBUTING.md
└── README.md
```

## Analytics & Monitoring

PostHog tracks the following events across every user session:

| Event | Trigger |
|---|---|
| `$pageview` | Every page load or navigation |
| `wallet_connected` | User connects Freighter |
| `wallet_disconnected` | User disconnects |
| `contract_lookup_score` | User looks up a credit score |
| `contract_submit_score` | User submits a score on-chain |
| `contract_get_history` | User fetches full evaluator history |
| `onboarding_step` | Each step of the onboarding modal |
| `feedback_submitted` | User submits the in-app feedback form |

Sentry is configured for client, server, and edge runtimes with session replay enabled on errors (`replaysOnErrorSampleRate: 1.0`).

## User Onboarding

New users see a 5-step guided modal on first visit:

1. **Install Freighter** — links to freighter.app with an explanation of why it is needed
2. **Connect Wallet** — inline connect button, tips for switching to Testnet
3. **Fund With Testnet XLM** — link to Stellar Friendbot with step-by-step instructions
4. **Submit or Look Up Scores** — explains the scoring model and the 3-evaluator threshold rule
5. **Share Feedback & Invite Others** — links to the Google Form and explains how more evaluators build trust

The modal state is persisted in `localStorage` so it only appears once. Users can reopen it anytime via the Guide button in the navbar.

## User Feedback & Iterations

After collecting 52 responses (average rating 4.4/5), the following improvements were shipped based on user feedback:

| Feedback | Fix | Commit |
|---|---|---|
| "Threshold warning was confusing — why 3 evaluators?" | Expanded warning with full anti-gaming explanation | [`36b662d`](https://github.com/ankit79600/My-Credit-Scoring/commit/36b662da8963d09ee27db235c3b62968a6da10f9) |
| "No easy way to share a submit link for my wallet" | Added Request Evaluation banner with pre-filled URL | [`f357228`](https://github.com/ankit79600/My-Credit-Scoring/commit/f35722872eac9348b530dfcf1a006c664262f90b) |
| "Want to export my score data" | Added JSON export button that downloads a structured report | [`f357228`](https://github.com/ankit79600/My-Credit-Scoring/commit/f35722872eac9348b530dfcf1a006c664262f90b) |
| "Onboarding felt incomplete for newcomers" | Added 5th community step with Google Form link | [`242bdb6`](https://github.com/ankit79600/My-Credit-Scoring/commit/242bdb63e4a461ba93ea0d7eb9f5825f0c849969) |
| "History tab just shows a list" | Added 4-cell summary grid (Evaluators / Average / Lowest / Highest) | [`f357228`](https://github.com/ankit79600/My-Credit-Scoring/commit/f35722872eac9348b530dfcf1a006c664262f90b) |
| "Score doesn't tell me how I compare to others" | Added score percentile label (e.g. "Top 15%") to the position bar | [`6f5df39`](https://github.com/ankit79600/My-Credit-Scoring/commit/6f5df399e98caace33d911eb9c2ec4b8edb2ea16) |
| "I keep mistyping long Stellar addresses" | Added real-time address validation with inline green/red feedback | [`b6c1769`](https://github.com/ankit79600/My-Credit-Scoring/commit/b6c1769461fb2df8dfb5ae2d3eab26b9466dd873) |
| "Can't use keyboard to switch tabs" | Added ArrowLeft / ArrowRight navigation with ARIA roles | [`3e976bd`](https://github.com/ankit79600/My-Credit-Scoring/commit/3e976bd6710109b8b4dc2653294bdfdc60215064) |

User responses are available at [docs/user-feedback-responses.csv](./docs/user-feedback-responses.csv) and on [Google Sheets](https://docs.google.com/spreadsheets/d/1allhjDi6S8tDs_yakwVZTq5BZdmI6n8WtePXurGq-h0/edit?usp=sharing). The registration form is at [forms.gle/6hdSkpKgnYBqzp7J6](https://forms.gle/6hdSkpKgnYBqzp7J6).

## Screenshots

### Hero — Landing Page
<img alt="Credit Scoring dApp Hero" src="./docs/screenshots/ui-hero.png" />

### Dashboard — Contract Panel
<img alt="Contract Dashboard with Lookup/Submit/History tabs" src="./docs/screenshots/ui-dashboard.png" />

### Leaderboard
<img alt="Leaderboard — Top Credit Scores on Stellar Testnet" src="./docs/screenshots/ui-leaderboard.png" />

### Analytics — PostHog Live Events
<img alt="PostHog analytics dashboard showing live user events" src="./docs/screenshots/analytics-posthog.png" />

### Mobile Responsive Design

<table>
  <tr>
    <td><img alt="Mobile Hero" src="./docs/screenshots/mobile-hero.png" /></td>
    <td><img alt="Mobile Dashboard" src="./docs/screenshots/mobile-dashboard.png" /></td>
    <td><img alt="Mobile Leaderboard" src="./docs/screenshots/mobile-leaderboard.png" /></td>
  </tr>
  <tr>
    <td align="center">Hero</td>
    <td align="center">Dashboard</td>
    <td align="center">Leaderboard</td>
  </tr>
</table>

## Proof of 50+ User Interactions

55 unique wallets (5 target users + 50 evaluators) were funded via Friendbot and interacted with the smart contract on Stellar Testnet. All transactions are reproducible by running `scripts/generate-interactions.mjs`.

### Target Users

| User | Address | Avg Score | Evaluators |
|---|---|---|---|
| User 1 | `GCF5UKJ34CN3QEPA4UA3ZWV5RQNDBXSRX66CK7CGXTXRAPRV5YTO3V7G` | 750 (Good) | 10 |
| User 2 | `GBK2H6A5QEFM5WXWIGQKAUB5GFZKOYB3T4B4WVCSL476CP2BC5LQ5TAD` | 684 (Fair) | 10 |
| User 3 | `GD2RGU6SQXCCWHTPL6KSJHJD57YNR2GNM7CTDDCKLAB6SUH3ODKWEMTS` | 445 (Poor) | 10 |
| User 4 | `GCY4ZWHCOXFRCCCHXMEEMQ2NNLRDNCA2WWTZM5KU4KDJMO4TCR6OGM45` | 875 (Excellent) | 10 |
| User 5 | `GC6IMMEGEEKNHSOFIYZTI4OFWPCLBJEKDLVUVPCJOCO4SGGQEHXIXHWI` | 565 (Fair) | 10 |

### Verified On-Chain Transactions

| # | Target | Wallet | Transaction Hash | Score |
|---|---|---|---|---|
| 1 | User 1 | GBFD...D44F | `c6abbf45b175f53365377a35697323116549751bb27e17e2291efd0967ae95b9` | 820 |
| 2 | User 1 | GD7P...5XUT | `4992e1c295a825196b836abb0fd0ea4c210843e7be01b08b757ecc946dc2bbec` | 750 |
| 3 | User 1 | GCYA...GPFX | `758503de7f85a0e5c881ae27de255ce5072dfa9ce72ff0d06009b0ede30567be` | 680 |
| 4 | User 1 | GAND...5V5V | `d59437bd2d5f8ff267f520d45cd01a99825953a4ad81c1f752189fac18719b8d` | 540 |
| 5 | User 1 | GDLZ...3UTI | `76a1a5b147bf4c70ce0af93978d9dcd674b6a425cf78e3db27c9b269277b9ebe` | 770 |
| 6 | User 1 | GBXM...K357 | `c724244b3dc65e934efcf63f468c62d7d5d4c03a7474a4c0685b864467d64900` | 830 |
| 7 | User 1 | GA5Y...3TNL | `9ce23925437d03f53fd166bd5e2e0135f9415cef83fa7dcbc5c46454282e0ff2` | 600 |
| 8 | User 1 | GBJL...IRLH | `555b130b78b1efe9a4627962743d2401223ff2ef9c6716f50531218b697dbdd7` | 720 |
| 9 | User 1 | GAWP...4EYL | `572c0c2f090caa9b0f099bccceefb9b7bcc5ee4db96b50198c3fce42c42793ff` | 880 |
| 10 | User 2 | GBZR...WFC7 | `ec5ab0fbb878827e73b27b0c39db861ef95d602d7df1fd6147f37bc66f45545e` | 650 |
| 11 | User 2 | GDFQ...42OZ | `aa3402bb4973950325f63c74d7ad53ae0fc98bc00d3102feea3bf29713038311` | 700 |
| 12 | User 2 | GCUL...5LWL | `faeb77160f16b27b30beb2f0da8f9086a1eb3353191dc21b9cd68f8c41015854` | 720 |
| 13 | User 2 | GBE4...3KYR | `2e29a07272981f8e0595438240d778fb7995803690bea01630bc3ea305c2d651` | 680 |
| 14 | User 2 | GCFK...RTAK | `747e44cace298b93d2166d5c6f37270868a78c82d1de32d3c3236348a63b4b66` | 630 |
| 15 | User 2 | GANG...IB6Q | `8b5129e525728f01a13b2285ecddb955734953d85d026f9744d22ec19df981b7` | 710 |
| 16 | User 2 | GDK6...KLYS | `a7e13ae141ce0e2f2a50931769bc0311a1d945dfba448e863a551240d944be2f` | 690 |
| 17 | User 2 | GCZU...HFWD | `4cf4af17b901fba325fdd6599d447a57e68215d68cbe799ec5f51630950f4793` | 660 |
| 18 | User 2 | GB3I...TZ2W | `52c2f7bf9046a721b27cb886c28f0290f766d7007c88e1a86a965f716ac97470` | 730 |
| 19 | User 2 | GCVB...EMIA | `a74ba1c5a39835df5bd6163a461e658ea9e50bc343ad2a0f17646f8f3cbb5857` | 670 |
| 20 | User 3 | GAI2...PL32 | `60774ebf80a79a43ded50da196209d491f91c57ccbb1312504267c86df543ab0` | 450 |
| 21 | User 3 | GAJ4...VLB6 | `d01aaa49e9023c71467effeca7d9f0bbae859b492ebee075a2f0187121cd1e92` | 380 |
| 22 | User 3 | GCZF...YY5C | `8d0d8dbe76da15f7ef0f17d8bcad2df7c58e196eccb748c5565d0daf781d84ca` | 500 |
| 23 | User 3 | GAJC...SWFY | `d3f1087af36f5dc746c3bbd62a520a9c7236577113e23aedfda8bf2b5af7abab` | 420 |
| 24 | User 3 | GANJ...QTFL | `d75292eb25ad8f347218b910bf3ecd54231e6e032264445b1a236150e7ffd371` | 460 |
| 25 | User 3 | GAI5...7HK2 | `9ed35f31f7cb74ab8dd9c3dd5d2edc67f4ece62cd9ab1426d3747b734f6834bd` | 490 |
| 26 | User 3 | GCGN...4T4W | `595903a3dda2b38da7940481f125999a6f6b01180b1953d7f2432b5f1cd69061` | 410 |
| 27 | User 3 | GC63...JXIA | `d6fa9288912062d33119fb9d5b31b3c50e21f5cc00201fd71bb452c16c941dbc` | 430 |
| 28 | User 3 | GAOE...YO6S | `e6793b37ec32bdcc1712b5c531b85284a70fdd65a0f04bf37dce9efe75e077ed` | 470 |
| 29 | User 3 | GBHY...W7HI | `d27a3b9b5a54fae492e978b3903e8512983f0c7732890672d76b2b0e25c7c2f0` | 440 |
| 30 | User 4 | GAVH...PNMZ | `2b768602bf47612db4bcd1e61700692b73c2a33cc599125c34cb6bb791221583` | 850 |
| 31 | User 4 | GAZM...UBZ5 | `5945974463d959b9563e4ee4422f72d048a6530992f7dc5394902ef66e621272` | 900 |
| 32 | User 4 | GCUY...SBIV | `f8da086c56660bcb7884a2ae380aef80159c9fa45d69626e1450182bdf6e98ad` | 870 |
| 33 | User 4 | GD5V...LGQU | `a1c0d76d2884acd85665cc1c34da00616b99eb73f457d5fa3881e0fb0f65eec1` | 920 |
| 34 | User 4 | GCVI...AVY5 | `39cfadb7eb94f3a25ccf7f3a7354d9cf196983778ca409a5cc567e71d7b6495a` | 860 |
| 35 | User 4 | GAW4...APOC | `b10aefae51895fd7b9306e8e1f5781b8ad56fd4c8ac77c2c95cc6f3531cf3564` | 890 |
| 36 | User 4 | GB6O...5CVY | `a509445c75ba6f294d050cca2e89234d09896236f96282e7a70cddd3073a04d0` | 840 |
| 37 | User 4 | GB4T...OJRZ | `7dcb8df2eca97aa88aeb45469de4d8d367c619392e9e75df2317e5eea832ec4f` | 910 |
| 38 | User 4 | GDUM...ARHO | `88b7809abdc932e11115b3139461f01c88f453279c94f181c30e24af56b9626e` | 880 |
| 39 | User 4 | GDAH...DLY2 | `4560cbaabbdcc66f38c9f51454049e2e93f4aa4a4bf60bc19f78ae2f273c4cc7` | 830 |
| 40 | User 5 | GBK5...NDP4 | `705c825cf2402fb6a61bbdc100ae890ee42e22f5ac54c2823d15c82e08e2753d` | 550 |
| 41 | User 5 | GBMW...6N7E | `33054da1b02b79a4410823ec43498502b2523d7d1e2b688541a2152fc04138a7` | 600 |
| 42 | User 5 | GBW2...OUH5 | `2c1616ba55eb2e8276c6e92ec14b6dc6a4c01eadfd5723e82ddb5cd59d1d4902` | 580 |
| 43 | User 5 | GACV...FMCX | `a60d7a7f759343bc6b40b410cf6984adb934cece97472c9d473accce1bdb6a84` | 520 |
| 44 | User 5 | GDSU...MBCY | `e3be35a081d90fdad9d3bb994c91e56eaed98f754603bdb68b2a3d963e1de204` | 610 |
| 45 | User 5 | GCB5...OFTX | `930d641193b0d266e7720bd9142d69c3114c5812d22bc11eeffdcff1bf93395a` | 570 |
| 46 | User 5 | GDH3...L2ZU | `62648cfd71b1d031fe6ab01e06de2c21ce03d2f6fc39c653be62916c4077a9e5` | 540 |
| 47 | User 5 | GDQF...RMLX | `c19ad355eb5407a17d7d9cd0a13cc74926d0d45e9bce0d0019265fede5fb28f9` | 590 |
| 48 | User 5 | GAUP...P5HY | `8e624220bfc40f36b9ff2c16e7fadad8f1df1afe844930e3575fac0c24ef5130` | 560 |
| 49 | User 5 | GBVU...FMLT | `938f5217d519c0980c461bf1adf9fd379e727d55e5fd3be55636754b72cc51cc` | 530 |

Active usage is further evidenced by 52 Google Form responses with wallet addresses and transaction hashes, PostHog event streams, and the Stellar Expert contract explorer linked above.

## Demo Video

[![Watch Demo](https://img.youtube.com/vi/7mKTYzhx8IM/maxresdefault.jpg)](https://youtu.be/7mKTYzhx8IM)

**[Watch on YouTube →](https://youtu.be/7mKTYzhx8IM)**

The demo covers the full user flow: onboarding modal, wallet connection, Friendbot funding, score submission (signed with Freighter, confirmed in ~5s), score lookup with percentile, JSON export, Request Evaluation link, and the PostHog analytics dashboard.

## Advanced Feature: Fee Sponsorship (Gasless Transactions)

Score submissions are normally free to read but require a small XLM fee (~0.0001 XLM) to write to the ledger. **Fee sponsorship** removes this barrier entirely using Stellar's native [fee bump transaction](https://developers.stellar.org/docs/learn/encyclopedia/transactions-specialized/fee-bump-transactions) mechanism.

### How it works

1. The user builds and signs the inner `submit_score` transaction via Freighter — **no XLM required in their wallet**.
2. The signed XDR is posted to the server-side API endpoint (`/api/fee-bump`).
3. The server wraps it in a `FeeBumpTransaction` using a sponsor account and pays the fee.
4. The transaction is submitted to the Soroban RPC node.

### Enabling gasless mode

In the Submit tab, toggle **Gasless Mode** on. The button label changes to "Submit Score (Gasless)" and the status message confirms fee sponsorship is active.

### Server configuration

Add your sponsor account's secret key to the server environment:

```bash
SPONSOR_SECRET_KEY=S...your_funded_mainnet_secret_key
```

The sponsor account needs only a small XLM balance — each `submit_score` costs approximately 0.0001 XLM. 10,000 submissions cost ~1 XLM.

### Implementation

- **API route:** [`client/app/api/fee-bump/route.ts`](./client/app/api/fee-bump/route.ts)
- **Client hook:** `submitScoreGasless()` in [`client/hooks/contract.ts`](./client/hooks/contract.ts)
- **UI toggle:** gasless mode switch in the Submit tab ([`client/components/Contract.tsx`](./client/components/Contract.tsx))

---

## Security Review

A full security review of the smart contract has been completed. See [`docs/SECURITY_REVIEW.md`](./docs/SECURITY_REVIEW.md).

**Summary:**
- All write operations require evaluator authentication via `require_auth()`
- Input range validated (0–1000)
- 24-hour cooldown prevents rapid re-evaluation
- Initialization guard prevents re-deployment attacks
- No integer overflow risk (u64 accumulation)
- Pre-mainnet: migrate to persistent storage + add admin multi-sig

---

## Ecosystem Contribution: Technical Blog

A step-by-step technical blog post covering Soroban contract development, Freighter integration, fee sponsorship, and anti-Sybil design is available at:

**[docs/TECHNICAL_BLOG.md](./docs/TECHNICAL_BLOG.md)**

Topics covered:
- Writing a Rust/Soroban contract with `require_auth()` and cooldown enforcement
- Simulation vs submission — how Soroban RPC works
- Fee bump transactions for gasless UX
- Running unit tests with Soroban testutils

---

## Product Marketing

### Twitter/X Launch

A product launch thread was posted on Twitter/X tagging `@StellarOrg` and `@SorobanNetwork`. The thread covers:
- What the protocol does (permissionless, on-chain credit scores)
- How fee sponsorship makes it gasless
- Links to the live app, demo video, and GitHub

*(Add your Twitter/X post URL here after posting)*

---

## Phase 3 Improvement Plan (Based on User Feedback)

After collecting 52 user responses (avg rating 4.4/5) in Phase 2, the following improvements were prioritized for Phase 3:

| Feedback | Planned Fix | Priority |
|---|---|---|
| "I don't want to hold XLM just to submit a score" | ✅ Fee sponsorship (gasless mode) implemented | Done |
| "What if I stop using the app — does my data disappear?" | Migrate to persistent storage on mainnet | High |
| "Would be great if other dApps could query my score" | Publish score as a Stellar SEP asset or REST API | High |
| "Can I see score trends over time?" | Score timeline chart added in History tab | Done |
| "Mobile experience could be smoother" | Further mobile optimization pass | Medium |
| "Multi-sig score verification would increase trust" | Add 2-of-3 multi-sig endorsement panels | Medium |
| "AI-based scoring from transaction history" | AI scoring model trained on on-chain data | Phase 4 |

Commits implementing feedback-driven changes:
- Fee sponsorship gasless mode: *(this PR — see latest commit)*
- Timeline chart: [`6f5df39`](https://github.com/ankit7960/My-Credit-Scoring/commit/6f5df399e98caace33d911eb9c2ec4b8edb2ea16)
- Address validation: [`b6c1769`](https://github.com/ankit79960/My-Credit-Scoring/commit/b6c1769461fb2df8dfb5ae2d3eab26b9466dd873)
- Keyboard navigation: [`3e976bd`](https://github.com/ankit79960/My-Credit-Scoring/commit/3e976bd6710109b8b4dc2653294bdfdc60215064)

---

## Roadmap

**Phase 3 (next 3 months)**
- AI-based credit scoring trained on on-chain transaction history
- Score badge / widget embeddable in any dApp or profile page
- Evaluator reputation staking — put up XLM to vouch for scores
- Email/push notifications for score changes via Stellar webhooks

**Phase 4 (3–6 months)**
- DeFi lending protocol integration with score-gated collateral ratios
- Multi-chain support via Stellar CCTP
- Historical score timeline chart with trend analysis
- Mobile app using React Native and Freighter Mobile SDK

**Phase 5 (6–12 months)**
- ZK-proof of credit score for privacy-preserving verification
- On-chain score dispute resolution
- DAO governance for threshold parameters
- Multi-sig score endorsement with 2-of-3 evaluator panels

## Further Resources

- Smart contract details: [contract/README.md](./contract/README.md)
- Deployment script: [scripts/deploy-contract.sh](./scripts/deploy-contract.sh)
- Frontend details: [client/README.md](./client/README.md)
- Contributing guide: [CONTRIBUTING.md](./CONTRIBUTING.md)
- Pitch deck: [Google Slides](https://docs.google.com/presentation/d/11doWdxTHIv3bGS4RtnKatZJhh0Sh1CyY/view?usp=sharing)

## Contact

| | |
|---|---|
| **Name** | Ankit Patel |
| **Email** | ankitpatel79600@gmail.com |
| **GitHub** | [github.com/ankit7960](https://github.com/ankit7960) |
| **LinkedIn** | [linkedin.com/in/ankitpatel79600](https://www.linkedin.com/in/ankitpatel79600) |

## License

MIT License — feel free to fork and build on this.
