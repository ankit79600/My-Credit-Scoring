"use client";

import {
  Account,
  Contract,
  Networks,
  TransactionBuilder,
  Keypair,
  xdr,
  Address,
  nativeToScVal,
  scValToNative,
  rpc,
} from "@stellar/stellar-sdk";
import {
  isConnected,
  getAddress,
  signTransaction,
  setAllowed,
  isAllowed,
  requestAccess,
} from "@stellar/freighter-api";

// ============================================================
// CONSTANTS — Update these for your contract
// ============================================================

const USE_MAINNET = process.env.NEXT_PUBLIC_USE_MAINNET === "true";

/** Your deployed Soroban contract ID */
export const CONTRACT_ADDRESS = USE_MAINNET
  ? (process.env.NEXT_PUBLIC_MAINNET_CONTRACT_ADDRESS ?? "")
  : "CAHR6ZKV2N7U5UMU3HQICGMNZ37YRNAXATPXQTOOPYION3RORD6C2WNR";

/** Network passphrase */
export const NETWORK_PASSPHRASE = USE_MAINNET ? Networks.PUBLIC : Networks.TESTNET;

/** Soroban RPC URL */
export const RPC_URL = USE_MAINNET
  ? (process.env.NEXT_PUBLIC_MAINNET_RPC_URL ?? "https://soroban-mainnet.stellar.org")
  : "https://soroban-testnet.stellar.org";

/** Horizon URL */
export const HORIZON_URL = USE_MAINNET
  ? "https://horizon.stellar.org"
  : "https://horizon-testnet.stellar.org";

/** Network name for Freighter */
export const NETWORK = USE_MAINNET ? "PUBLIC" : "TESTNET";

// ============================================================
// RPC Server Instance
// ============================================================

const server = new rpc.Server(RPC_URL);

// ============================================================
// Wallet Helpers
// ============================================================

export async function checkConnection(): Promise<boolean> {
  const result = await isConnected();
  return result.isConnected;
}

export async function connectWallet(): Promise<string> {
  const connResult = await isConnected();
  if (!connResult.isConnected) {
    throw new Error("Freighter extension is not installed or not available.");
  }

  const allowedResult = await isAllowed();
  if (!allowedResult.isAllowed) {
    // requestAccess opens the permission popup and returns the address directly
    const { address, error } = await requestAccess();
    if (error) throw new Error(error);
    if (!address) throw new Error("Could not retrieve wallet address from Freighter.");
    return address;
  }

  const { address, error } = await getAddress();
  if (error) throw new Error(error);
  if (!address) {
    // Already allowed but getAddress failed — fall back to requestAccess
    const result = await requestAccess();
    if (result.error) throw new Error(result.error);
    if (!result.address) throw new Error("Could not retrieve wallet address from Freighter.");
    return result.address;
  }
  return address;
}

export async function getWalletAddress(): Promise<string | null> {
  try {
    const connResult = await isConnected();
    if (!connResult.isConnected) return null;

    const allowedResult = await isAllowed();
    if (!allowedResult.isAllowed) return null;

    const { address } = await getAddress();
    return address || null;
  } catch {
    return null;
  }
}

// ============================================================
// Contract Interaction Helpers
// ============================================================

/**
 * Build, simulate, and optionally sign + submit a Soroban contract call.
 *
 * @param method   - The contract method name to invoke
 * @param params   - Array of xdr.ScVal parameters for the method
 * @param caller   - The public key (G...) of the calling account
 * @param sign     - If true, signs via Freighter and submits. If false, only simulates.
 * @returns        The result of the simulation or submission
 */
export async function callContract(
  method: string,
  params: xdr.ScVal[] = [],
  caller: string,
  sign: boolean = true
) {
  const contract = new Contract(CONTRACT_ADDRESS);
  // For read-only simulation, avoid a network round-trip for a potentially
  // non-existent account by constructing a dummy Account with sequence 0.
  const account = sign
    ? await server.getAccount(caller)
    : new Account(caller, "0");

  const tx = new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...params))
    .setTimeout(30)
    .build();

  const simulated = await server.simulateTransaction(tx);

  if (rpc.Api.isSimulationError(simulated)) {
    throw new Error(
      `Simulation failed: ${(simulated as rpc.Api.SimulateTransactionErrorResponse).error}`
    );
  }

  if (!sign) {
    // Read-only call — just return the simulation result
    return simulated;
  }

  // Prepare the transaction with the simulation result
  const prepared = rpc.assembleTransaction(tx, simulated).build();

  // Sign with Freighter
  const signResult = await signTransaction(prepared.toXDR(), {
    networkPassphrase: NETWORK_PASSPHRASE,
  });
  if (signResult.error) throw new Error(signResult.error);
  const { signedTxXdr } = signResult;

  const txToSubmit = TransactionBuilder.fromXDR(
    signedTxXdr,
    NETWORK_PASSPHRASE
  );

  const result = await server.sendTransaction(txToSubmit);

  if (result.status === "ERROR") {
    throw new Error(`Transaction submission failed: ${result.status}`);
  }

  // Poll for confirmation
  let getResult = await server.getTransaction(result.hash);
  while (getResult.status === "NOT_FOUND") {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    getResult = await server.getTransaction(result.hash);
  }

  if (getResult.status === "FAILED") {
    throw new Error("Transaction failed on chain.");
  }

  return { ...getResult, txHash: result.hash };
}

/**
 * Read-only contract call (does not require signing).
 */
export async function readContract(
  method: string,
  params: xdr.ScVal[] = [],
  caller?: string
) {
  const account =
    caller || Keypair.random().publicKey(); // Use a random keypair for read-only
  const sim = await callContract(method, params, account, false);
  if (
    rpc.Api.isSimulationSuccess(sim as rpc.Api.SimulateTransactionResponse) &&
    (sim as rpc.Api.SimulateTransactionSuccessResponse).result
  ) {
    return scValToNative(
      (sim as rpc.Api.SimulateTransactionSuccessResponse).result!.retval
    );
  }
  return null;
}

// ============================================================
// ScVal Conversion Helpers
// ============================================================

export function toScValString(value: string): xdr.ScVal {
  return nativeToScVal(value, { type: "string" });
}

export function toScValU32(value: number): xdr.ScVal {
  return nativeToScVal(value, { type: "u32" });
}

export function toScValI128(value: bigint): xdr.ScVal {
  return nativeToScVal(value, { type: "i128" });
}

export function toScValAddress(address: string): xdr.ScVal {
  return new Address(address).toScVal();
}

export function toScValBool(value: boolean): xdr.ScVal {
  return nativeToScVal(value, { type: "bool" });
}

// ============================================================
// Supply Chain Tracker — Contract Methods
// ============================================================

// ============================================================
// Credit Score Contract — Contract Methods
// ============================================================

export function toScValU64(value: number): xdr.ScVal {
  return nativeToScVal(value, { type: "u64" });
}

/**
 * Submit a credit score for a user.
 * Calls: submit_score(user: Address, score: u32, evaluator: Address)
 */
export async function submitScore(
  caller: string,
  user: string,
  score: number,
  evaluator: string
): Promise<string> {
  const res = await callContract(
    "submit_score",
    [
      toScValAddress(user),
      toScValU32(score),
      toScValAddress(evaluator),
    ],
    caller,
    true
  ) as { txHash: string };
  return res.txHash;
}

/**
 * Get all score entries for a user (read-only).
 * Calls: get_scores(user: Address) -> Vec<ScoreEntry>
 * Returns: Array of { evaluator: string, score: number }
 */
export async function getScores(user: string, caller?: string) {
  return readContract(
    "get_scores",
    [toScValAddress(user)],
    caller
  );
}

/**
 * Get the number of unique evaluators who have submitted scores for a user (read-only).
 * Calls: get_evaluator_count(user: Address) -> u32
 */
export async function getEvaluatorCount(user: string, caller?: string) {
  return readContract(
    "get_evaluator_count",
    [toScValAddress(user)],
    caller
  );
}

/**
 * Calculate the average credit score across all evaluators (read-only).
 * Calls: get_average_score(user: Address) -> u32
 */
export async function getAverageScore(user: string, caller?: string) {
  return readContract(
    "get_average_score",
    [toScValAddress(user)],
    caller
  );
}

/**
 * Get the lowest score submitted for a user (read-only).
 * Calls: get_min_score(user: Address) -> u32
 */
export async function getMinScore(user: string, caller?: string) {
  return readContract("get_min_score", [toScValAddress(user)], caller);
}

/**
 * Get the highest score submitted for a user (read-only).
 * Calls: get_max_score(user: Address) -> u32
 */
export async function getMaxScore(user: string, caller?: string) {
  return readContract("get_max_score", [toScValAddress(user)], caller);
}

/**
 * Check whether a specific evaluator has submitted a score for a user (read-only).
 * Calls: has_evaluator(user: Address, evaluator: Address) -> bool
 */
export async function hasEvaluator(user: string, evaluator: string, caller?: string) {
  return readContract(
    "has_evaluator",
    [toScValAddress(user), toScValAddress(evaluator)],
    caller
  );
}

/**
 * Returns the average score only if at least minEvaluators have submitted.
 * Returns 0 if the threshold is not met.
 * Calls: get_average_score_if_threshold(user: Address, min_evaluators: u32) -> u32
 */
export async function getAverageScoreIfThreshold(
  user: string,
  minEvaluators: number,
  caller?: string
) {
  return readContract(
    "get_average_score_if_threshold",
    [toScValAddress(user), toScValU32(minEvaluators)],
    caller
  );
}

/**
 * Remove an evaluator's score for a user. Only the evaluator themselves can call this.
 * Calls: remove_score(user: Address, evaluator: Address)
 */
export async function removeScore(
  caller: string,
  user: string,
  evaluatorAddr: string
): Promise<string> {
  const res = await callContract(
    "remove_score",
    [toScValAddress(user), toScValAddress(evaluatorAddr)],
    caller,
    true
  ) as { txHash: string };
  return res.txHash;
}

/**
 * Submit a credit score using fee sponsorship (gasless — user pays no XLM fees).
 * The inner transaction is signed by the user via Freighter, then the server
 * wraps it in a FeeBumpTransaction and pays the fee using SPONSOR_SECRET_KEY.
 *
 * Falls back to normal submitScore if the /api/fee-bump endpoint is unavailable.
 */
export async function submitScoreGasless(
  caller: string,
  user: string,
  score: number,
  evaluator: string
): Promise<string> {
  const contract = new Contract(CONTRACT_ADDRESS);
  const account = await server.getAccount(caller);

  const tx = new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        "submit_score",
        toScValAddress(user),
        toScValU32(score),
        toScValAddress(evaluator)
      )
    )
    .setTimeout(30)
    .build();

  // Simulate to get footprint + auth
  const simulated = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(simulated)) {
    throw new Error(
      `Simulation failed: ${(simulated as rpc.Api.SimulateTransactionErrorResponse).error}`
    );
  }

  const prepared = rpc.assembleTransaction(tx, simulated).build();

  // User signs only the inner tx (they pay nothing — fee bump covers it)
  const signResult = await signTransaction(prepared.toXDR(), {
    networkPassphrase: NETWORK_PASSPHRASE,
  });
  if (signResult.error) throw new Error(signResult.error);

  // Send to our fee-bump API endpoint
  const res = await fetch("/api/fee-bump", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ innerXdr: signResult.signedTxXdr }),
  });

  const data = (await res.json()) as { hash?: string; error?: string };
  if (!res.ok || !data.hash) {
    throw new Error(data.error ?? "Fee bump submission failed");
  }

  return data.hash;
}

export { nativeToScVal, scValToNative, Address, xdr };
