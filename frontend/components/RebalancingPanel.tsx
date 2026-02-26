"use client";

import { useState } from "react";
import { RebalancingAnalysis, ContextFlag, parseJsonField, formatDate } from "@/lib/api";

const URGENCY_STYLES = {
  high:   "bg-red-900/20 text-red-400 border-red-800/30",
  medium: "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30",
  low:    "bg-[#1a3a2a] text-[#00C05A] border-[#00C05A]/30",
};

function ContextFlagCard({ flag }: { flag: ContextFlag }) {
  const [expanded, setExpanded] = useState(false);
  const urgencyStyle = URGENCY_STYLES[flag.urgency] ?? URGENCY_STYLES.low;

  return (
    <button
      onClick={() => setExpanded(!expanded)}
      className={`w-full text-left rounded-xl border p-4 transition-all ${urgencyStyle}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-snug">{flag.flag}</p>
          {expanded && (
            <div className="mt-3 space-y-2">
              <p className="text-sm opacity-90 leading-relaxed">{flag.context}</p>
              {flag.suggested_question && (
                <div className="border-t border-current/20 pt-2 mt-2">
                  <p className="text-xs opacity-70 uppercase tracking-wide font-medium mb-1">Consider asking:</p>
                  <p className="text-sm italic opacity-90">"{flag.suggested_question}"</p>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-medium capitalize opacity-80 border border-current/30 rounded-full px-2 py-0.5">
            {flag.urgency}
          </span>
          <span className="text-xs opacity-60">{expanded ? "▲" : "▼"}</span>
        </div>
      </div>
    </button>
  );
}

interface RebalancingPanelProps {
  analysis: RebalancingAnalysis;
  clientName: string;
  onReanalyze: () => void;
  loading: boolean;
}

export default function RebalancingPanel({
  analysis,
  clientName,
  onReanalyze,
  loading,
}: RebalancingPanelProps) {
  const contextFlags = parseJsonField<ContextFlag[]>(analysis.context_flags, []);
  const urgency = analysis.overall_urgency ?? "low";
  const urgencyStyle = URGENCY_STYLES[urgency as keyof typeof URGENCY_STYLES] ?? URGENCY_STYLES.low;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white">
          What this means for {clientName}
        </h3>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-medium border rounded-full px-2.5 py-1 capitalize ${urgencyStyle}`}>
            {urgency} urgency
          </span>
          <button
            onClick={onReanalyze}
            disabled={loading}
            className="text-xs font-medium text-[#00C05A] hover:text-[#00C05A]/80 border border-[#00C05A]/40 hover:border-[#00C05A] rounded-lg px-3 py-1.5 transition-all disabled:opacity-50"
          >
            {loading ? "Analyzing…" : "↺ Re-analyze"}
          </button>
        </div>
      </div>

      {/* AI Narrative */}
      {analysis.no_action_needed ? (
        <div className="rounded-xl bg-[#1a3a2a] border border-[#00C05A]/30 p-4">
          <div className="flex items-start gap-3">
            <span className="text-[#00C05A] text-lg shrink-0">✓</span>
            <div>
              <p className="text-sm font-semibold text-[#00C05A] mb-1">Portfolio is well-balanced</p>
              <p className="text-sm text-[#9CA3AF] leading-relaxed">{analysis.ai_narrative}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] p-4">
          <p className="text-sm text-[#9CA3AF] leading-relaxed">{analysis.ai_narrative}</p>
        </div>
      )}

      {/* Context Flags */}
      {contextFlags.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-[#9CA3AF] uppercase tracking-wide font-medium">
            Context-aware flags — click to expand
          </p>
          {contextFlags.map((flag, i) => (
            <ContextFlagCard key={i} flag={flag} />
          ))}
        </div>
      )}

      {/* Timestamp */}
      <p className="text-xs text-[#9CA3AF] text-right">
        Analyzed {formatDate(analysis.generated_at)} ·
        Engine calculated drift, GPT-4o provided context interpretation
      </p>
    </div>
  );
}
