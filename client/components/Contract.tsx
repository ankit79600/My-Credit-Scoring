"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  submitScore,
  submitScoreGasless,
  getScores,
  getEvaluatorCount,
  getAverageScore,
  getAverageScoreIfThreshold,
  hasEvaluator,
  removeScore,
  CONTRACT_ADDRESS,
} from "@/hooks/contract";
import { trackContractInteraction } from "@/lib/posthog";
import { AnimatedCard } from "@/components/ui/animated-card";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { cn } from "@/lib/utils";

// ── Icons ────────────────────────────────────────────────────

function SpinnerIcon() {
  return (
    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function CopyIcon({ copied }: { copied?: boolean }) {
  return copied ? (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ) : (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

// ── Styled Input ─────────────────────────────────────────────

function isValidStellarAddress(addr: string): boolean {
  return addr.length === 56 && addr.startsWith("G");
}

function Input({
  label,
  hint,
  validateAddress,
  ...props
}: { label: string; hint?: React.ReactNode; validateAddress?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  const val = (props.value as string) ?? "";
  const showValidation = validateAddress && val.length > 0;
  const valid = showValidation && isValidStellarAddress(val);
  const invalid = showValidation && !isValidStellarAddress(val);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-[11px] font-medium uppercase tracking-wider text-white/30">
          {label}
        </label>
        <div className="flex items-center gap-2">
          {showValidation && (
            <span className={cn("text-[10px] font-mono", valid ? "text-[#34d399]/70" : "text-[#f87171]/60")}>
              {valid ? "valid address" : `${val.length}/56`}
            </span>
          )}
          {hint}
        </div>
      </div>
      <div className={cn(
        "group rounded-xl border bg-white/[0.02] p-px transition-all",
        valid ? "border-[#34d399]/25 shadow-[0_0_20px_rgba(52,211,153,0.06)]" :
        invalid ? "border-[#f87171]/20" :
        "border-white/[0.06] focus-within:border-[#7c6cf0]/30 focus-within:shadow-[0_0_20px_rgba(124,108,240,0.08)]"
      )}>
        <input
          {...props}
          className="w-full rounded-[11px] bg-transparent px-4 py-3 font-mono text-sm text-white/90 placeholder:text-white/15 outline-none"
        />
      </div>
    </div>
  );
}

// ── Method Signature ─────────────────────────────────────────

function MethodSignature({
  name,
  params,
  returns,
  color,
}: {
  name: string;
  params: string;
  returns?: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-[#0d0d0d] px-4 py-3 font-mono text-sm">
      <span style={{ color }} className="font-semibold">fn</span>
      <span className="text-white/70">{name}</span>
      <span className="text-white/20 text-xs">{params}</span>
      {returns && (
        <span className="ml-auto text-white/15 text-[10px]">{returns}</span>
      )}
    </div>
  );
}

// ── Score Config ─────────────────────────────────────────────

function getScoreConfig(score: number): { color: string; bg: string; label: string; hex: string } {
  if (score >= 800) return { color: "text-[#34d399]", bg: "bg-[#34d399]", label: "Excellent", hex: "#34d399" };
  if (score >= 700) return { color: "text-[#4fc3f7]", bg: "bg-[#4fc3f7]", label: "Good",      hex: "#4fc3f7" };
  if (score >= 600) return { color: "text-[#fbbf24]", bg: "bg-[#fbbf24]", label: "Fair",      hex: "#fbbf24" };
  if (score >= 400) return { color: "text-[#fb923c]", bg: "bg-[#fb923c]", label: "Poor",      hex: "#fb923c" };
  return             { color: "text-[#f87171]", bg: "bg-[#f87171]", label: "Very Poor",        hex: "#f87171" };
}

// ── Utilities ────────────────────────────────────────────────

function getScorePercentile(score: number): string {
  if (score >= 950) return "Top 5%";
  if (score >= 850) return "Top 15%";
  if (score >= 750) return "Top 30%";
  if (score >= 650) return "Top 50%";
  if (score >= 500) return "Top 65%";
  if (score >= 350) return "Bottom 35%";
  return "Bottom 15%";
}

function formatTimestamp(ts: number | bigint | undefined): string {
  if (!ts) return "—";
  return new Date(Number(ts) * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── Score Bar Chart ──────────────────────────────────────────

function ScoreBarChart({ scores }: { scores: Array<{ score: number }> }) {
  if (scores.length === 0) return null;
  const avg = Math.round(scores.reduce((s, e) => s + e.score, 0) / scores.length);

  return (
    <div className="rounded-xl border border-white/[0.07] bg-[#0d0d0d] p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-medium uppercase tracking-wider text-white/25">Distribution</span>
        <span className="text-[10px] text-white/25 font-mono">avg {avg}</span>
      </div>
      <div className="flex items-end gap-1.5 h-14">
        {scores.map((entry, i) => {
          const cfg = getScoreConfig(entry.score);
          const heightPct = Math.max(8, (entry.score / 1000) * 100);
          return (
            <div key={i} className="relative flex-1 flex flex-col items-center gap-1 group">
              <div
                className={cn("w-full rounded-sm transition-opacity opacity-50 group-hover:opacity-100", cfg.bg)}
                style={{ height: `${heightPct}%` }}
              />
              <span className="text-[8px] font-mono text-white/20 leading-none">{entry.score}</span>
              <div className="absolute bottom-full mb-1.5 hidden group-hover:flex bg-[#1a1a2e]/95 border border-white/[0.08] rounded-lg px-2 py-1.5 text-[9px] text-white/70 whitespace-nowrap z-10 flex-col items-center gap-0.5 shadow-xl">
                <span className={cn("font-mono font-bold", cfg.color)}>{entry.score}</span>
                <span className="text-white/40">{cfg.label}</span>
              </div>
            </div>
          );
        })}
      </div>
      {/* Average marker */}
      <div className="mt-2 flex items-center gap-2">
        <div className="h-px flex-1 bg-white/[0.04]" />
        <span className="text-[9px] text-white/20 font-mono">avg {avg}</span>
        <div className="h-px flex-1 bg-white/[0.04]" />
      </div>
    </div>
  );
}

// ── Score Timeline Chart ─────────────────────────────────────

function ScoreTimelineChart({ scores }: { scores: Array<{ score: number; timestamp?: number | bigint }> }) {
  const withTime = scores.filter((e) => e.timestamp != null);
  if (withTime.length < 2) return null;

  const sorted = [...withTime].sort((a, b) => Number(a.timestamp) - Number(b.timestamp));
  const W = 360;
  const H = 80;
  const PAD = { top: 10, right: 12, bottom: 18, left: 28 };

  const minTs = Number(sorted[0].timestamp);
  const maxTs = Number(sorted[sorted.length - 1].timestamp);
  const tsRange = maxTs - minTs || 1;

  const toX = (ts: number) => PAD.left + ((ts - minTs) / tsRange) * (W - PAD.left - PAD.right);
  const toY = (score: number) => PAD.top + (1 - score / 1000) * (H - PAD.top - PAD.bottom);

  const points = sorted.map((e) => ({ x: toX(Number(e.timestamp)), y: toY(e.score), score: e.score }));
  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");
  const avg = Math.round(sorted.reduce((s, e) => s + e.score, 0) / sorted.length);
  const avgY = toY(avg);

  const fmtDate = (ts: number) => {
    const d = new Date(ts * 1000);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  return (
    <div className="rounded-xl border border-white/[0.07] bg-[#0d0d0d] p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-medium uppercase tracking-wider text-white/25">Score Timeline</span>
        <span className="text-[10px] text-white/25 font-mono">avg {avg}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible">
        {/* Y-axis labels */}
        {[0, 500, 1000].map((v) => (
          <g key={v}>
            <text x={PAD.left - 4} y={toY(v) + 3} textAnchor="end" fill="rgba(255,255,255,0.2)" fontSize="7" fontFamily="monospace">{v}</text>
            <line x1={PAD.left} y1={toY(v)} x2={W - PAD.right} y2={toY(v)} stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
          </g>
        ))}
        {/* Avg line */}
        <line x1={PAD.left} y1={avgY} x2={W - PAD.right} y2={avgY} stroke="rgba(255,255,255,0.12)" strokeWidth="0.8" strokeDasharray="3 3" />
        {/* Polyline */}
        <polyline points={polyline} fill="none" stroke="rgba(124,108,240,0.6)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
        {/* Dots + labels */}
        {points.map((p, i) => {
          const cfg = getScoreConfig(p.score);
          return (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="3" fill={cfg.hex ?? "#7c6cf0"} opacity="0.9" />
              <circle cx={p.x} cy={p.y} r="5" fill="transparent" stroke={cfg.hex ?? "#7c6cf0"} strokeWidth="0.8" opacity="0.4" />
            </g>
          );
        })}
        {/* X-axis date labels */}
        {[sorted[0], sorted[sorted.length - 1]].map((e, i) => (
          <text key={i} x={toX(Number(e.timestamp))} y={H - 2} textAnchor={i === 0 ? "start" : "end"} fill="rgba(255,255,255,0.2)" fontSize="7" fontFamily="monospace">
            {fmtDate(Number(e.timestamp))}
          </text>
        ))}
      </svg>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────

type Tab = "lookup" | "submit" | "history";

interface ScoreEntry {
  evaluator: string;
  score: number;
  timestamp?: number | bigint;
}

interface ContractUIProps {
  walletAddress: string | null;
  onConnect: () => void;
  isConnecting: boolean;
}

export default function ContractUI({ walletAddress, onConnect, isConnecting }: ContractUIProps) {
  const [activeTab, setActiveTab] = useState<Tab>("lookup");
  const [error, setError] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [copiedAddr, setCopiedAddr] = useState<string | null>(null);
  const [shareToast, setShareToast] = useState(false);


  // Submit form state
  const [submitUser, setSubmitUser] = useState("");
  const [submitScoreValue, setSubmitScoreValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [gaslessMode, setGaslessMode] = useState(false);

  // Lookup state
  const [lookupUser, setLookupUser] = useState("");
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupData, setLookupData] = useState<{
    evaluatorCount: number;
    averageScore: number;
    trustedScore: number;
    minScore: number;
    maxScore: number;
    scores: ScoreEntry[];
  } | null>(null);

  // Submit — has_evaluator check
  const [alreadyEvaluated, setAlreadyEvaluated] = useState(false);
  const [isCheckingEvaluator, setIsCheckingEvaluator] = useState(false);

  // History — remove score
  const [removingEvaluator, setRemovingEvaluator] = useState<string | null>(null);

  // History state
  const [historyUser, setHistoryUser] = useState("");
  const [isGettingHistory, setIsGettingHistory] = useState(false);
  const [historyData, setHistoryData] = useState<ScoreEntry[] | null>(null);

  const truncate = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  // ── Copy to clipboard ──────────────────────────────────────

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopiedAddr(text);
    setTimeout(() => setCopiedAddr(null), 2000);
  }, []);

  // ── Lookup logic (extracted so URL init can call it) ───────

  const performLookup = useCallback(async (address: string) => {
    setError(null);
    setIsLookingUp(true);
    setLookupData(null);
    try {
      const [countResult, avgResult, scoresResult, trustedResult] = await Promise.all([
        getEvaluatorCount(address, walletAddress || undefined),
        getAverageScore(address, walletAddress || undefined),
        getScores(address, walletAddress || undefined),
        getAverageScoreIfThreshold(address, 3, walletAddress || undefined),
      ]);
      const entries = (scoresResult ?? []) as ScoreEntry[];
      const scoreValues = entries.map((e) => e.score);
      setLookupData({
        evaluatorCount: countResult ?? 0,
        averageScore: avgResult ?? 0,
        trustedScore: trustedResult ?? 0,
        minScore: scoreValues.length ? Math.min(...scoreValues) : 0,
        maxScore: scoreValues.length ? Math.max(...scoreValues) : 0,
        scores: entries,
      });
      trackContractInteraction("lookup_score", { evaluator_count: countResult ?? 0 });
      // Sync URL so this lookup is shareable
      const url = new URL(window.location.href);
      url.searchParams.set("user", address);
      window.history.replaceState({}, "", url.toString());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Query failed");
    } finally {
      setIsLookingUp(false);
    }
  }, [walletAddress]);

  // ── Read ?user= from URL on first mount ───────────────────

  const didInitRef = useRef(false);
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    const params = new URLSearchParams(window.location.search);
    const user = params.get("user");
    if (user && user.startsWith("G")) {
      setLookupUser(user);
      setActiveTab("lookup");
      performLookup(user);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLookup = useCallback(async () => {
    if (!lookupUser.trim()) return setError("Enter a user address");
    await performLookup(lookupUser.trim());
  }, [lookupUser, performLookup]);

  // ── has_evaluator check when submit address changes ───────

  useEffect(() => {
    if (!walletAddress || !submitUser.trim() || !submitUser.startsWith("G")) {
      setAlreadyEvaluated(false);
      return;
    }
    let cancelled = false;
    setIsCheckingEvaluator(true);
    hasEvaluator(submitUser.trim(), walletAddress, walletAddress)
      .then((result) => { if (!cancelled) setAlreadyEvaluated(!!result); })
      .catch(() => { if (!cancelled) setAlreadyEvaluated(false); })
      .finally(() => { if (!cancelled) setIsCheckingEvaluator(false); });
    return () => { cancelled = true; };
  }, [submitUser, walletAddress]);

  // ── Submit ────────────────────────────────────────────────

  const handleSubmitScore = useCallback(async () => {
    if (!walletAddress) return setError("Connect wallet first");
    if (!submitUser.trim() || !submitScoreValue.trim()) return setError("Fill in all fields");
    const scoreNum = parseInt(submitScoreValue, 10);
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 1000) {
      return setError("Score must be between 0 and 1000");
    }
    setError(null);
    setTxHash(null);
    setIsSubmitting(true);
    setTxStatus(gaslessMode ? "Awaiting signature (fee sponsored)..." : "Awaiting signature...");
    try {
      const hash = gaslessMode
        ? await submitScoreGasless(walletAddress, submitUser.trim(), scoreNum, walletAddress)
        : await submitScore(walletAddress, submitUser.trim(), scoreNum, walletAddress);
      trackContractInteraction("submit_score", { score: scoreNum, gasless: gaslessMode });
      setTxHash(hash);
      setTxStatus("Score submitted on-chain!");
      setSubmitUser("");
      setSubmitScoreValue("");
      setTimeout(() => { setTxStatus(null); setTxHash(null); }, 8000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Transaction failed");
      setTxStatus(null);
    } finally {
      setIsSubmitting(false);
    }
  }, [walletAddress, submitUser, submitScoreValue]);

  // ── History ───────────────────────────────────────────────

  const handleGetHistory = useCallback(async () => {
    if (!historyUser.trim()) return setError("Enter a user address");
    setError(null);
    setIsGettingHistory(true);
    setHistoryData(null);
    try {
      const result = await getScores(historyUser.trim(), walletAddress || undefined);
      trackContractInteraction("get_history", { entry_count: (result ?? []).length });
      setHistoryData((result ?? []) as ScoreEntry[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Query failed");
    } finally {
      setIsGettingHistory(false);
    }
  }, [historyUser, walletAddress]);

  // ── Remove score ─────────────────────────────────────────

  const handleRemoveScore = useCallback(async (targetUser: string, evaluatorAddr: string) => {
    if (!walletAddress) return setError("Connect wallet first");
    setRemovingEvaluator(evaluatorAddr);
    setError(null);
    try {
      await removeScore(walletAddress, targetUser, evaluatorAddr);
      setHistoryData((prev) => prev ? prev.filter((e) => e.evaluator !== evaluatorAddr) : prev);
      trackContractInteraction("remove_score", {});
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Remove failed");
    } finally {
      setRemovingEvaluator(null);
    }
  }, [walletAddress]);

  // ── Share current lookup ──────────────────────────────────

  const handleShare = useCallback(async () => {
    const url = new URL(window.location.href);
    if (lookupUser.trim()) url.searchParams.set("user", lookupUser.trim());
    await copyToClipboard(url.toString());
    setShareToast(true);
    setTimeout(() => setShareToast(false), 2000);
  }, [lookupUser, copyToClipboard]);

  // ── Copy score report as text ─────────────────────────────

  const handleCopyReport = useCallback(async () => {
    if (!lookupData) return;
    const lines = [
      `Credit Score Report — ${lookupUser}`,
      `Generated: ${new Date().toUTCString()}`,
      ``,
      `Average Score : ${lookupData.averageScore} / 1000 (${getScoreConfig(lookupData.averageScore).label})`,
      `Evaluators    : ${lookupData.evaluatorCount}`,
      lookupData.evaluatorCount > 1
        ? `Range         : ${lookupData.minScore} – ${lookupData.maxScore}`
        : "",
      ``,
      `Individual Scores:`,
      ...lookupData.scores.map((e, i) =>
        `  ${i + 1}. ${e.evaluator}  →  ${e.score}  (${getScoreConfig(e.score).label})`
      ),
      ``,
      `Verified on Stellar Soroban testnet`,
    ].filter((l) => l !== undefined);
    await copyToClipboard(lines.join("\n"));
    setShareToast(true);
    setTimeout(() => setShareToast(false), 2000);
  }, [lookupData, lookupUser, copyToClipboard]);

  // ── Export score data as JSON ─────────────────────────────

  const handleExportJSON = useCallback(async () => {
    if (!lookupData) return;
    const payload = {
      user: lookupUser,
      generatedAt: new Date().toISOString(),
      network: "Stellar Testnet",
      contract: CONTRACT_ADDRESS,
      summary: {
        evaluatorCount: lookupData.evaluatorCount,
        averageScore: lookupData.averageScore,
        minScore: lookupData.minScore,
        maxScore: lookupData.maxScore,
        trusted: lookupData.evaluatorCount >= 3,
      },
      scores: lookupData.scores.map((e) => ({
        evaluator: e.evaluator,
        score: e.score,
        rating: getScoreConfig(e.score).label,
        timestamp: e.timestamp ? new Date(Number(e.timestamp) * 1000).toISOString() : null,
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `credit-score-${lookupUser.slice(0, 8)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [lookupData, lookupUser]);

  // ── Request evaluation link (pre-fills submit tab with your address) ──

  const handleRequestEvaluation = useCallback(async () => {
    if (!walletAddress) return;
    const url = new URL(window.location.href);
    url.searchParams.set("submit_for", walletAddress);
    await copyToClipboard(url.toString());
    setShareToast(true);
    setTimeout(() => setShareToast(false), 2000);
  }, [walletAddress, copyToClipboard]);

  // ── Read ?submit_for= from URL on first mount ─────────────

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const submitFor = params.get("submit_for");
    if (submitFor && submitFor.startsWith("G")) {
      setSubmitUser(submitFor);
      setActiveTab("submit");
      // Clean the URL param after reading
      const url = new URL(window.location.href);
      url.searchParams.delete("submit_for");
      window.history.replaceState({}, "", url.toString());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tabs: { key: Tab; label: string; desc: string; color: string; icon: React.ReactNode; num: string }[] = [
    {
      key: "lookup",
      label: "Lookup",
      desc: "Query any address",
      color: "#4fc3f7",
      num: "01",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
        </svg>
      ),
    },
    {
      key: "submit",
      label: "Submit",
      desc: "Rate a wallet",
      color: "#7c6cf0",
      num: "02",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ),
    },
    {
      key: "history",
      label: "History",
      desc: "Past evaluations",
      color: "#fbbf24",
      num: "03",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
        </svg>
      ),
    },
  ];

  const handleTabKeyDown = useCallback((e: React.KeyboardEvent, currentKey: Tab) => {
    const order: Tab[] = ["lookup", "submit", "history"];
    const idx = order.indexOf(currentKey);
    if (e.key === "ArrowRight") {
      e.preventDefault();
      const next = order[(idx + 1) % order.length];
      setActiveTab(next);
      setError(null);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      const prev = order[(idx - 1 + order.length) % order.length];
      setActiveTab(prev);
      setError(null);
    }
  }, []);

  const meetsThreshold = lookupData ? lookupData.trustedScore > 0 : false;

  return (
    <div className="w-full animate-fade-in-up-delayed">
      {/* Toasts */}
      {error && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-[#f87171]/15 bg-[#f87171]/[0.05] px-4 py-3 backdrop-blur-sm animate-slide-down">
          <span className="mt-0.5 text-[#f87171]"><AlertIcon /></span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[#f87171]/90">Error</p>
            <p className="text-xs text-[#f87171]/50 mt-0.5 break-all">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="shrink-0 text-[#f87171]/30 hover:text-[#f87171]/70 text-lg leading-none">&times;</button>
        </div>
      )}

      {txStatus && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-[#34d399]/15 bg-[#34d399]/[0.05] px-4 py-3 backdrop-blur-sm shadow-[0_0_30px_rgba(52,211,153,0.05)] animate-slide-down">
          <span className="text-[#34d399] mt-0.5">
            {txStatus.includes("on-chain") ? <CheckIcon /> : <SpinnerIcon />}
          </span>
          <div className="flex flex-col gap-1">
            <span className="text-sm text-[#34d399]/90">{txStatus}</span>
            {txHash && (
              <a
                href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#34d399]/50 hover:text-[#34d399]/80 underline underline-offset-2 transition-colors font-mono"
              >
                View on Stellar Expert →
              </a>
            )}
          </div>
        </div>
      )}

      {shareToast && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-[#4fc3f7]/15 bg-[#4fc3f7]/[0.05] px-4 py-3 backdrop-blur-sm animate-slide-down">
          <span className="text-[#4fc3f7]"><CheckIcon /></span>
          <span className="text-sm text-[#4fc3f7]/90">Link copied to clipboard</span>
        </div>
      )}

      {/* Main Card */}
      <div className="rounded-2xl">
        <AnimatedCard className="p-0" containerClassName="rounded-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-white/25">Contract Node #001</span>
                <span className="text-[9px] text-white/10">·</span>
                <span className="text-[9px] font-mono text-white/20">Soroban Smart Contract</span>
              </div>
              <button
                onClick={() => copyToClipboard(CONTRACT_ADDRESS)}
                className="flex items-center gap-1.5 text-[11px] font-semibold text-white/70 font-mono hover:text-white/90 transition-colors group"
                title="Copy contract address"
              >
                {truncate(CONTRACT_ADDRESS)}
                <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white/30">
                  <CopyIcon copied={copiedAddr === CONTRACT_ADDRESS} />
                </span>
              </button>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-[#34d399]/20 bg-[#34d399]/[0.05] px-3 py-1 text-[9px] font-mono uppercase tracking-wider text-[#34d399]/70">
              <span className="h-1.5 w-1.5 rounded-full bg-[#34d399] animate-pulse" />
              Network active
            </div>
          </div>

          {/* Tabs */}
          <div className="grid grid-cols-3 gap-3 border-b border-white/[0.06] px-6 py-4">
            {tabs.map((t) => {
              const isActive = activeTab === t.key;
              return (
                <button
                  key={t.key}
                  role="tab"
                  aria-selected={isActive}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => { setActiveTab(t.key); setError(null); setLookupData(null); setHistoryData(null); }}
                  onKeyDown={(e) => handleTabKeyDown(e, t.key)}
                  className={cn(
                    "relative flex flex-col items-center gap-2 rounded-xl border px-4 py-4 text-center transition-all duration-200",
                    isActive
                      ? "border-white/[0.12] bg-[#0d0d0d]"
                      : "border-white/[0.04] bg-transparent hover:border-white/[0.08] hover:bg-white/[0.02]"
                  )}
                  style={isActive ? { borderColor: `${t.color}30`, boxShadow: `0 0 20px ${t.color}10` } : undefined}
                >
                  {/* Number badge */}
                  <span
                    className="absolute right-2.5 top-2.5 text-[9px] font-mono tracking-wider"
                    style={{ color: isActive ? t.color : "rgba(255,255,255,0.15)" }}
                  >
                    {t.num}
                  </span>

                  {/* Icon */}
                  <span style={{ color: isActive ? t.color : "rgba(255,255,255,0.25)" }}>
                    {t.icon}
                  </span>

                  {/* Label */}
                  <div>
                    <p
                      className="text-[11px] font-semibold uppercase tracking-widest"
                      style={{ color: isActive ? t.color : "rgba(255,255,255,0.35)" }}
                    >
                      {t.label}
                    </p>
                    <p className="mt-0.5 text-[9px] text-white/20 tracking-wide">{t.desc}</p>
                  </div>

                  {/* Active bottom line */}
                  {isActive && (
                    <span
                      className="absolute bottom-0 left-4 right-4 h-[1.5px] rounded-full"
                      style={{ background: t.color }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* ── Lookup ── */}
            {activeTab === "lookup" && (
              <div className="space-y-5">
                <MethodSignature name="get_evaluator_count / get_average_score" params="(user: Address)" returns="-> u32" color="#4fc3f7" />
                {!walletAddress && (
                  <div className="flex items-center gap-2 rounded-xl border border-[#4fc3f7]/10 bg-[#4fc3f7]/[0.03] px-4 py-2.5 text-xs text-[#4fc3f7]/50">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    No wallet needed — lookups are read-only and free
                  </div>
                )}

                <Input
                  label="User Address"
                  value={lookupUser}
                  onChange={(e) => setLookupUser(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                  placeholder="G..."
                  validateAddress
                  hint={
                    walletAddress ? (
                      <button
                        onClick={() => setLookupUser(walletAddress)}
                        className="flex items-center gap-1 text-[10px] text-[#4fc3f7]/50 hover:text-[#4fc3f7] transition-colors"
                      >
                        <UserIcon /> My address
                      </button>
                    ) : undefined
                  }
                />

                {walletAddress && !lookupData && (
                  <div className="flex items-center gap-2 rounded-xl border border-[#7c6cf0]/10 bg-[#7c6cf0]/[0.03] px-4 py-2.5 text-xs text-[#7c6cf0]/50">
                    <LinkIcon />
                    <span>Share a link so others can rate you:</span>
                    <button
                      onClick={handleRequestEvaluation}
                      className="ml-auto text-[#7c6cf0]/60 hover:text-[#7c6cf0] transition-colors underline underline-offset-2"
                    >
                      Copy request link
                    </button>
                  </div>
                )}

                <div className="flex gap-2">
                  <ShimmerButton onClick={handleLookup} disabled={isLookingUp} shimmerColor="#4fc3f7" className="flex-1">
                    {isLookingUp ? <><SpinnerIcon /> Looking up...</> : <><SearchIcon /> Look Up Score</>}
                  </ShimmerButton>
                  {lookupData && (
                    <button
                      onClick={handleShare}
                      className="flex items-center gap-1.5 rounded-xl border border-white/[0.07] bg-[#0d0d0d] px-4 py-2 text-xs text-white/40 hover:text-white/70 hover:border-white/[0.10] transition-all"
                      title="Copy shareable link"
                    >
                      <ShareIcon /> Share
                    </button>
                  )}
                  {lookupData && (
                    <button
                      onClick={() => { setLookupData(null); setLookupUser(""); setError(null); const url = new URL(window.location.href); url.searchParams.delete("user"); window.history.replaceState({}, "", url.toString()); }}
                      className="flex items-center gap-1.5 rounded-xl border border-white/[0.07] bg-[#0d0d0d] px-3 py-2 text-xs text-white/30 hover:text-white/60 hover:border-white/[0.10] transition-all"
                      title="Clear results"
                    >
                      &times;
                    </button>
                  )}
                </div>

                {lookupData && (
                  <div className="space-y-4 animate-fade-in-up">
                    {/* Threshold warning */}
                    {lookupData.evaluatorCount > 0 && !meetsThreshold && (
                      <div className="flex items-start gap-3 rounded-xl border border-[#fbbf24]/15 bg-[#fbbf24]/[0.03] px-4 py-3 text-xs text-white/40">
                        <span className="text-[#fbbf24] mt-0.5"><AlertIcon /></span>
                        <div className="space-y-1">
                          <span>
                            <span className="font-semibold text-[#fbbf24]/70">Low confidence:</span>{" "}
                            Only {lookupData.evaluatorCount} evaluator{lookupData.evaluatorCount !== 1 ? "s" : ""} — at least 3 needed for a trusted score.
                          </span>
                          <p className="text-[10px] text-white/25 leading-relaxed">
                            The 3-evaluator threshold prevents a single party from gaming the score.
                            The average is shown but marked as unverified until the minimum is met.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-white/[0.07] bg-[#0d0d0d] p-4 text-center">
                        <div className="text-2xl font-bold text-white/90">{lookupData.evaluatorCount}</div>
                        <div className="text-[10px] text-white/25 mt-1 uppercase tracking-wider">Evaluators</div>
                      </div>
                      <div className="rounded-xl border border-white/[0.07] bg-[#0d0d0d] p-4 text-center relative">
                        {meetsThreshold && (
                          <span className="absolute -top-2 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full border border-[#34d399]/30 bg-[#34d399]/10 px-2 py-0.5 text-[8px] font-mono uppercase tracking-wider text-[#34d399]">
                            <span className="h-1 w-1 rounded-full bg-[#34d399]" />
                            Trusted
                          </span>
                        )}
                        {(() => {
                          const cfg = getScoreConfig(lookupData.averageScore);
                          return (
                            <>
                              <div className={cn("text-2xl font-bold", meetsThreshold ? cfg.color : "text-white/30")}>
                                {lookupData.averageScore}
                              </div>
                              <div className="text-[10px] text-white/25 mt-1 uppercase tracking-wider">
                                {meetsThreshold ? cfg.label : "Unverified"}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Score Spread */}
                    {lookupData.evaluatorCount > 1 && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-white/[0.07] bg-[#0d0d0d] p-3 text-center">
                          <div className={cn("text-lg font-bold font-mono", getScoreConfig(lookupData.minScore).color)}>
                            {lookupData.minScore}
                          </div>
                          <div className="text-[10px] text-white/25 mt-0.5 uppercase tracking-wider">Lowest</div>
                        </div>
                        <div className="rounded-xl border border-white/[0.07] bg-[#0d0d0d] p-3 text-center">
                          <div className={cn("text-lg font-bold font-mono", getScoreConfig(lookupData.maxScore).color)}>
                            {lookupData.maxScore}
                          </div>
                          <div className="text-[10px] text-white/25 mt-0.5 uppercase tracking-wider">Highest</div>
                        </div>
                      </div>
                    )}

                    {/* Score progress bar */}
                    {lookupData.averageScore > 0 && (
                      <div className="rounded-xl border border-white/[0.07] bg-[#0d0d0d] p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[10px] font-medium uppercase tracking-wider text-white/25">Score Position</span>
                          <div className="flex items-center gap-2">
                            {meetsThreshold && (
                              <span className="text-[10px] text-white/25">{getScorePercentile(lookupData.averageScore)}</span>
                            )}
                            <span className={cn("text-[10px] font-mono font-semibold", meetsThreshold ? getScoreConfig(lookupData.averageScore).color : "text-white/30")}>
                              {lookupData.averageScore} / 1000
                            </span>
                          </div>
                        </div>
                        <div className="relative h-2.5 rounded-full bg-white/[0.04] overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all duration-700", meetsThreshold ? getScoreConfig(lookupData.averageScore).bg : "bg-white/20")}
                            style={{ width: `${(lookupData.averageScore / 1000) * 100}%` }}
                          />
                        </div>
                        <div className="flex justify-between mt-2">
                          {["Very Poor", "Poor", "Fair", "Good", "Excellent"].map((label) => (
                            <span key={label} className="text-[8px] text-white/15">{label}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Score category breakdown */}
                    {lookupData.scores.length > 1 && (() => {
                      const bands = [
                        { label: "Excellent", min: 800, color: "bg-[#34d399]", text: "text-[#34d399]" },
                        { label: "Good", min: 700, color: "bg-[#4fc3f7]", text: "text-[#4fc3f7]" },
                        { label: "Fair", min: 600, color: "bg-[#fbbf24]", text: "text-[#fbbf24]" },
                        { label: "Poor", min: 400, color: "bg-[#fb923c]", text: "text-[#fb923c]" },
                        { label: "Very Poor", min: 0, color: "bg-[#f87171]", text: "text-[#f87171]" },
                      ];
                      const counts = bands.map((b, i) => ({
                        ...b,
                        count: lookupData.scores.filter((e) =>
                          e.score >= b.min && (i === 0 || e.score < bands[i - 1].min)
                        ).length,
                      })).filter((b) => b.count > 0);
                      if (counts.length <= 1) return null;
                      return (
                        <div className="rounded-xl border border-white/[0.07] bg-[#0d0d0d] p-4">
                          <span className="text-[10px] font-medium uppercase tracking-wider text-white/25 block mb-3">Rating Breakdown</span>
                          <div className="space-y-2">
                            {counts.map((b) => (
                              <div key={b.label} className="flex items-center gap-3">
                                <span className="text-[10px] text-white/35 w-16 shrink-0">{b.label}</span>
                                <div className="flex-1 h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                                  <div
                                    className={cn("h-full rounded-full", b.color)}
                                    style={{ width: `${(b.count / lookupData.scores.length) * 100}%` }}
                                  />
                                </div>
                                <span className={cn("text-[10px] font-mono w-4 text-right shrink-0", b.text)}>{b.count}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Bar chart */}
                    {lookupData.scores.length > 0 && (
                      <ScoreBarChart scores={lookupData.scores} />
                    )}

                    {/* Score Entries */}
                    {lookupData.scores.length > 0 && (
                      <div className="rounded-xl border border-white/[0.07] bg-[#0d0d0d] overflow-hidden">
                        <div className="border-b border-white/[0.06] px-4 py-3 flex items-center justify-between">
                          <span className="text-[10px] font-medium uppercase tracking-wider text-white/25">Score Entries</span>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={handleCopyReport}
                              className="flex items-center gap-1 text-[10px] text-white/25 hover:text-white/60 transition-colors"
                              title="Copy full score report as text"
                            >
                              <CopyIcon /> Copy Report
                            </button>
                            <button
                              onClick={handleExportJSON}
                              className="flex items-center gap-1 text-[10px] text-white/25 hover:text-white/60 transition-colors"
                              title="Download score data as JSON"
                            >
                              <DownloadIcon /> JSON
                            </button>
                            <span className="text-[10px] text-white/25 font-mono">{lookupData.scores.length} total</span>
                          </div>
                        </div>
                        <div className="p-2 space-y-2">
                          {lookupData.scores.map((entry, i) => {
                            const cfg = getScoreConfig(entry.score);
                            const isSelf = walletAddress && entry.evaluator === walletAddress;
                            const isSelfScored = walletAddress && entry.evaluator === lookupUser;
                            return (
                              <div key={i} className="flex items-center justify-between rounded-lg px-3 py-2 border border-white/[0.06] bg-[#0d0d0d]">
                                <div className="flex flex-col gap-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs text-white/50">{truncate(entry.evaluator)}</span>
                                    <button
                                      onClick={() => copyToClipboard(entry.evaluator)}
                                      className="text-white/20 hover:text-white/60 transition-colors"
                                      title="Copy address"
                                    >
                                      <CopyIcon copied={copiedAddr === entry.evaluator} />
                                    </button>
                                    {isSelf && (
                                      <span className="text-[8px] rounded-full border border-[#7c6cf0]/30 bg-[#7c6cf0]/10 px-1.5 py-0.5 text-[#7c6cf0]/70 font-medium">You</span>
                                    )}
                                    {isSelfScored && (
                                      <span className="text-[8px] rounded-full border border-[#fbbf24]/30 bg-[#fbbf24]/10 px-1.5 py-0.5 text-[#fbbf24]/70 font-medium">Self</span>
                                    )}
                                  </div>
                                  {entry.timestamp ? (
                                    <span className="text-[9px] text-white/25">{formatTimestamp(entry.timestamp)}</span>
                                  ) : null}
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className={cn("h-1.5 w-1.5 rounded-full", cfg.bg)} />
                                  <span className={cn("font-mono text-sm font-semibold", cfg.color)}>{entry.score}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {lookupData.scores.length === 0 && (
                      <div className="rounded-xl border border-white/[0.07] bg-[#0d0d0d] px-4 py-6 text-center">
                        <p className="text-sm text-white/25">No scores found for this user</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── Submit ── */}
            {activeTab === "submit" && (
              <div className="space-y-5">
                <MethodSignature name="submit_score" params="(user: Address, score: u32, evaluator: Address)" color="#7c6cf0" />
                <div className="rounded-xl border border-[#7c6cf0]/15 bg-[#7c6cf0]/[0.03] px-4 py-3 text-xs text-white/40">
                  <span className="font-semibold text-[#7c6cf0]/70">Note:</span> Scores must be 0–1000. You are the evaluator.
                </div>
                <Input
                  label="User Address"
                  value={submitUser}
                  onChange={(e) => setSubmitUser(e.target.value)}
                  placeholder="G... (the person being rated)"
                  validateAddress
                />
                <Input
                  label="Score (0-1000)"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={submitScoreValue}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^0-9]/g, "");
                    if (v === "" || (parseInt(v, 10) <= 1000)) setSubmitScoreValue(v);
                  }}
                  placeholder="e.g. 750"
                />

                {/* Visual score slider */}
                {(() => {
                  const val = submitScoreValue !== "" ? parseInt(submitScoreValue, 10) : 0;
                  const cfg = getScoreConfig(isNaN(val) ? 0 : val);
                  const colorMap: Record<string, string> = {
                    "bg-[#34d399]": "#34d399",
                    "bg-[#4fc3f7]": "#4fc3f7",
                    "bg-[#fbbf24]": "#fbbf24",
                    "bg-[#fb923c]": "#fb923c",
                    "bg-[#f87171]": "#f87171",
                  };
                  const color = colorMap[cfg.bg] ?? "#7c6cf0";
                  const pct = isNaN(val) ? 0 : (val / 1000) * 100;
                  return (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium uppercase tracking-wider text-white/30">Visual Range</span>
                        <span className={cn("text-xs font-semibold", cfg.color)}>{cfg.label}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1000"
                        value={isNaN(val) ? 0 : val}
                        onChange={(e) => setSubmitScoreValue(e.target.value)}
                        className="score-slider"
                        style={{ "--slider-color": color, "--slider-pct": `${pct}%` } as React.CSSProperties}
                      />
                      <div className="flex justify-between text-[9px] text-white/20">
                        <span>Very Poor</span>
                        <span>Poor</span>
                        <span>Fair</span>
                        <span>Good</span>
                        <span>Excellent</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Gasless toggle */}
                <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#0d0d0d] px-4 py-3">
                  <div>
                    <p className="text-xs font-medium text-white/60">Gasless Mode</p>
                    <p className="text-[10px] text-white/25 mt-0.5">Fee-sponsored — you pay no XLM</p>
                  </div>
                  <button
                    onClick={() => setGaslessMode((v) => !v)}
                    className={cn(
                      "relative h-5 w-9 rounded-full border transition-all duration-200",
                      gaslessMode
                        ? "border-[#7c6cf0]/40 bg-[#7c6cf0]/20"
                        : "border-white/[0.10] bg-white/[0.04]"
                    )}
                    aria-pressed={gaslessMode}
                    aria-label="Toggle gasless mode"
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 h-3.5 w-3.5 rounded-full transition-all duration-200",
                        gaslessMode
                          ? "left-[18px] bg-[#7c6cf0]"
                          : "left-0.5 bg-white/30"
                      )}
                    />
                  </button>
                </div>

                {gaslessMode && (
                  <div className="flex items-start gap-2 rounded-xl border border-[#7c6cf0]/15 bg-[#7c6cf0]/[0.04] px-3 py-2.5 text-xs text-[#7c6cf0]/70">
                    <svg className="mt-0.5 shrink-0" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    A fee sponsor covers the transaction fee. You only sign the inner transaction — no XLM balance required.
                  </div>
                )}

                {walletAddress ? (
                  <div className="space-y-2">
                    {alreadyEvaluated && (
                      <div className="flex items-center gap-2 rounded-lg border border-[#fbbf24]/20 bg-[#fbbf24]/[0.05] px-3 py-2 text-xs text-[#fbbf24]/70">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        You already rated this address — submitting will update your score
                      </div>
                    )}
                    <ShimmerButton onClick={handleSubmitScore} disabled={isSubmitting || isCheckingEvaluator} shimmerColor="#7c6cf0" className="w-full">
                      {isSubmitting
                        ? <><SpinnerIcon /> {gaslessMode ? "Submitting (sponsored)..." : "Submitting..."}</>
                        : isCheckingEvaluator
                        ? <><SpinnerIcon /> Checking...</>
                        : alreadyEvaluated
                        ? <><StarIcon /> Update Score</>
                        : <><StarIcon /> {gaslessMode ? "Submit Score (Gasless)" : "Submit Score"}</>}
                    </ShimmerButton>
                  </div>
                ) : (
                  <button
                    onClick={async () => {
                      setError(null);
                      try {
                        await onConnect();
                      } catch (err: unknown) {
                        setError(err instanceof Error ? err.message : "Failed to connect wallet");
                      }
                    }}
                    disabled={isConnecting}
                    className="w-full rounded-xl border border-dashed border-[#7c6cf0]/20 bg-[#7c6cf0]/[0.03] py-4 text-sm text-[#7c6cf0]/60 hover:border-[#7c6cf0]/30 hover:text-[#7c6cf0]/80 active:scale-[0.99] transition-all disabled:opacity-50"
                  >
                    {isConnecting ? "Connecting..." : "Connect wallet to submit scores"}
                  </button>
                )}

                {/* Score Guide */}
                <div className="grid grid-cols-5 gap-2 pt-2">
                  {[
                    { range: "800-1000", label: "Excellent", color: "bg-[#34d399]" },
                    { range: "700-799", label: "Good", color: "bg-[#4fc3f7]" },
                    { range: "600-699", label: "Fair", color: "bg-[#fbbf24]" },
                    { range: "400-599", label: "Poor", color: "bg-[#fb923c]" },
                    { range: "0-399", label: "Very Poor", color: "bg-[#f87171]" },
                  ].map((s) => (
                    <div key={s.label} className="flex flex-col items-center gap-1.5 rounded-lg border border-white/[0.04] bg-white/[0.02] p-2">
                      <div className={cn("h-1.5 w-1.5 rounded-full", s.color)} />
                      <div className="text-[9px] font-mono text-white/35">{s.range}</div>
                      <div className="text-[8px] text-white/20 text-center leading-tight">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── History ── */}
            {activeTab === "history" && (
              <div className="space-y-5">
                <MethodSignature name="get_scores" params="(user: Address)" returns="-> Vec<ScoreEntry>" color="#fbbf24" />
                <Input
                  label="User Address"
                  value={historyUser}
                  onChange={(e) => setHistoryUser(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleGetHistory()}
                  placeholder="G..."
                  validateAddress
                  hint={
                    walletAddress ? (
                      <button
                        onClick={() => setHistoryUser(walletAddress)}
                        className="flex items-center gap-1 text-[10px] text-[#fbbf24]/50 hover:text-[#fbbf24] transition-colors"
                      >
                        <UserIcon /> My address
                      </button>
                    ) : undefined
                  }
                />
                <div className="flex gap-2">
                  <ShimmerButton onClick={handleGetHistory} disabled={isGettingHistory} shimmerColor="#fbbf24" className="flex-1">
                    {isGettingHistory ? <><SpinnerIcon /> Fetching...</> : <><ChartIcon /> Get Full History</>}
                  </ShimmerButton>
                  {historyData && (
                    <button
                      onClick={() => { setHistoryData(null); setHistoryUser(""); setError(null); }}
                      className="flex items-center gap-1.5 rounded-xl border border-white/[0.07] bg-[#0d0d0d] px-3 py-2 text-xs text-white/30 hover:text-white/60 hover:border-white/[0.10] transition-all"
                      title="Clear results"
                    >
                      &times;
                    </button>
                  )}
                </div>

                {historyData && (
                  <div className="space-y-3 animate-fade-in-up">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-white/25">All Score Entries</span>
                      <span className="text-[10px] text-white/25 font-mono">{historyData.length} total</span>
                    </div>

                    {/* History summary stats */}
                    {historyData.length > 0 && (() => {
                      const avg = Math.round(historyData.reduce((s, e) => s + e.score, 0) / historyData.length);
                      const min = Math.min(...historyData.map((e) => e.score));
                      const max = Math.max(...historyData.map((e) => e.score));
                      const cfg = getScoreConfig(avg);
                      const trusted = historyData.length >= 3;
                      return (
                        <div className="grid grid-cols-4 gap-2">
                          {[
                            { label: "Evaluators", value: historyData.length, color: "text-white/70" },
                            { label: "Average", value: avg, color: trusted ? cfg.color : "text-white/30" },
                            { label: "Lowest", value: min, color: getScoreConfig(min).color },
                            { label: "Highest", value: max, color: getScoreConfig(max).color },
                          ].map((s) => (
                            <div key={s.label} className="rounded-xl border border-white/[0.07] bg-[#0d0d0d] p-3 text-center">
                              <div className={`text-base font-bold font-mono ${s.color}`}>{s.value}</div>
                              <div className="text-[9px] text-white/25 mt-0.5 uppercase tracking-wider">{s.label}</div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                    {/* Timeline chart */}
                    <ScoreTimelineChart scores={historyData} />

                    {historyData.length === 0 ? (
                      <div className="rounded-xl border border-white/[0.07] bg-[#0d0d0d] px-4 py-6 text-center">
                        <p className="text-sm text-white/25">No scores found for this user</p>
                      </div>
                    ) : (
                      historyData.map((entry, i) => {
                        const cfg = getScoreConfig(entry.score);
                        return (
                          <div key={i} className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-[#0d0d0d] px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.02]">
                                <UserIcon />
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono text-xs text-white/70">{truncate(entry.evaluator)}</span>
                                  <button
                                    onClick={() => copyToClipboard(entry.evaluator)}
                                    className="text-white/20 hover:text-white/60 transition-colors"
                                    title="Copy address"
                                  >
                                    <CopyIcon copied={copiedAddr === entry.evaluator} />
                                  </button>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[9px] text-white/25">
                                    {entry.timestamp ? formatTimestamp(entry.timestamp) : `Evaluator #${i + 1}`}
                                  </span>
                                  <a
                                    href={`https://stellar.expert/explorer/testnet/account/${entry.evaluator}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[9px] text-[#4fc3f7]/40 hover:text-[#4fc3f7]/80 transition-colors underline underline-offset-2"
                                    title="View on Stellar Expert"
                                  >
                                    Stellar Expert →
                                  </a>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={cn("font-mono text-sm font-bold", cfg.color)}>{entry.score}</span>
                              <div className={cn("h-1.5 w-1.5 rounded-full", cfg.bg)} />
                              {walletAddress && entry.evaluator === walletAddress && (
                                <button
                                  onClick={() => handleRemoveScore(historyUser.trim(), entry.evaluator)}
                                  disabled={removingEvaluator === entry.evaluator}
                                  className="flex items-center gap-1 rounded border border-[#f87171]/20 bg-[#f87171]/[0.05] px-2 py-0.5 text-[9px] text-[#f87171]/60 hover:bg-[#f87171]/10 hover:text-[#f87171] transition-colors disabled:opacity-40"
                                  title="Remove your score"
                                >
                                  {removingEvaluator === entry.evaluator ? <SpinnerIcon /> : "Remove"}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-white/[0.06] px-6 py-3 flex items-center justify-between">
            <p className="text-[9px] font-mono uppercase tracking-widest text-white/15">Stellar Testnet</p>
            <div className="flex items-center gap-3">
              {[
                { label: "Very Poor", color: "#f87171" },
                { label: "Poor", color: "#fb923c" },
                { label: "Fair", color: "#fbbf24" },
                { label: "Good", color: "#4fc3f7" },
                { label: "Excellent", color: "#34d399" },
              ].map((s) => (
                <span key={s.label} className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
                  <span className="text-[8px] font-mono text-white/15">{s.label}</span>
                </span>
              ))}
            </div>
          </div>
        </AnimatedCard>
      </div>
    </div>
  );
}
