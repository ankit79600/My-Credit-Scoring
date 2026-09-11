import { NextRequest, NextResponse } from "next/server";
import {
  Keypair,
  TransactionBuilder,
  Transaction,
  Networks,
  rpc,
} from "@stellar/stellar-sdk";

const MAINNET = process.env.NEXT_PUBLIC_USE_MAINNET === "true";
const NETWORK_PASSPHRASE = MAINNET ? Networks.PUBLIC : Networks.TESTNET;
const RPC_URL = MAINNET
  ? (process.env.MAINNET_RPC_URL ?? "https://soroban-mainnet.stellar.org")
  : "https://soroban-testnet.stellar.org";

const server = new rpc.Server(RPC_URL);

export async function POST(req: NextRequest) {
  try {
    const { innerXdr } = (await req.json()) as { innerXdr: string };
    if (!innerXdr) {
      return NextResponse.json({ error: "innerXdr is required" }, { status: 400 });
    }

    const sponsorSecret = process.env.SPONSOR_SECRET_KEY;
    if (!sponsorSecret) {
      return NextResponse.json(
        { error: "Fee sponsorship is not configured on this server." },
        { status: 503 }
      );
    }

    const sponsorKeypair = Keypair.fromSecret(sponsorSecret);

    // Parse the user-signed inner transaction
    const innerTx = TransactionBuilder.fromXDR(
      innerXdr,
      NETWORK_PASSPHRASE
    ) as Transaction;

    // Wrap it in a fee bump — sponsor pays the fee
    const feeBump = TransactionBuilder.buildFeeBumpTransaction(
      sponsorKeypair,
      "1000", // 0.0001 XLM per op (generous for Soroban)
      innerTx,
      NETWORK_PASSPHRASE
    );
    feeBump.sign(sponsorKeypair);

    const result = await server.sendTransaction(feeBump);

    if (result.status === "ERROR") {
      return NextResponse.json(
        { error: `Submission failed: ${result.status}` },
        { status: 500 }
      );
    }

    // Poll until the transaction is confirmed
    let getResult = await server.getTransaction(result.hash);
    let attempts = 0;
    while (getResult.status === "NOT_FOUND" && attempts < 30) {
      await new Promise((r) => setTimeout(r, 1000));
      getResult = await server.getTransaction(result.hash);
      attempts++;
    }

    if (getResult.status === "FAILED") {
      return NextResponse.json({ error: "Transaction failed on chain." }, { status: 500 });
    }

    return NextResponse.json({ hash: result.hash, status: getResult.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
