"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getPortfolio,
  analyzePortfolio,
  getClient,
  PortfolioData,
  RebalancingAnalysis,
  EngineOutput,
  ClientDetail,
  parseJsonField,
  formatCurrency,
  formatDate,
} from "@/lib/api";
import AllocationChart from "@/components/AllocationChart";
import DriftTable from "@/components/DriftTable";
import RebalancingPanel from "@/components/RebalancingPanel";

function DriftScoreBadge({ score }: { score: number }) {
  const color =
    score > 40 ? "bg-red-900/30 text-red-400 border-red-800/40" :
    score > 20 ? "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30" :
                 "bg-[#1a3a2a] text-[#00C05A] border-[#00C05A]/30";
  const label = score > 40 ? "Attention Needed" : score > 20 ? "Monitor" : "Balanced";
  return (
    <span className={`inline-flex items-center gap-1.5 border rounded-full px-3 py-1 text-sm font-semibold ${color}`}>
      <span className={`h-2 w-2 rounded-full ${score > 40 ? "bg-red-400" : score > 20 ? "bg-[#F59E0B]" : "bg-[#00C05A]"}`} />
      {score}/100 — {label}
    </span>
  );
}

export default function PortfolioPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [client, setClient] = useState<ClientDetail | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [engineOutput, setEngineOutput] = useState<EngineOutput | null>(null);
  const [analysis, setAnalysis] = useState<RebalancingAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [accountsOpen, setAccountsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  useEffect(() => {
    async function load() {
      try {
        const [clientData, portfolioData] = await Promise.all([
          getClient(Number(id)),
          getPortfolio(Number(id)),
        ]);
        setClient(clientData);
        setPortfolio(portfolioData);
        if (portfolioData.analysis) {
          setAnalysis(portfolioData.analysis);
          const eng = parseJsonField<EngineOutput>(portfolioData.analysis.portfolio_summary, null as unknown as EngineOutput);
          setEngineOutput(eng);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load portfolio");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function handleAnalyze() {
    setAnalyzing(true);
    setError(null);
    try {
      const result = await analyzePortfolio(Number(id));
      setAnalysis(result);
      const eng = parseJsonField<EngineOutput>(result.portfolio_summary, null as unknown as EngineOutput);
      setEngineOutput(eng);
      showToast("Portfolio analysis complete");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <p className="text-[#9CA3AF] animate-pulse">Loading portfolio…</p>
      </div>
    );
  }

  const driftScore = engineOutput?.drift_score ?? 0;
  const hasHoldings = (portfolio?.holdings?.length ?? 0) > 0;

  return (
    <div className="min-h-screen bg-[#0D0D0D]">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-[#1A1A1A] border border-[#00C05A]/40 text-[#00C05A] rounded-xl px-4 py-3 text-sm shadow-lg">
          ✓ {toast}
        </div>
      )}

      {/* Header */}
      <header className="border-b border-[#2A2A2A] bg-[#1A1A1A]/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
          <button onClick={() => router.push(`/clients/${id}`)} className="text-[#9CA3AF] hover:text-white transition-colors text-sm">
            ← {client?.name ?? "Client"}
          </button>
          <div className="h-4 w-px bg-[#2A2A2A]" />
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-lg bg-[#00C05A] flex items-center justify-center">
              <span className="text-black font-bold text-sm">W</span>
            </div>
            <span className="font-semibold text-white text-sm">Portfolio View</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Portfolio Health Bar */}
        <div className="rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A] p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs text-[#9CA3AF] uppercase tracking-wide mb-1">{client?.name} · Total Portfolio</p>
              <p className="text-3xl font-semibold text-white">
                {formatCurrency(engineOutput?.total_portfolio_value ?? client?.portfolio_value)}
              </p>
              {engineOutput && (
                <p className="text-xs text-[#9CA3AF] mt-1">As of {formatDate(engineOutput.as_of_date)}</p>
              )}
            </div>
            <div className="flex flex-col sm:items-end gap-3">
              {engineOutput ? (
                <>
                  <DriftScoreBadge score={driftScore} />
                  {analysis && (
                    <p className="text-xs text-[#9CA3AF]">
                      Last analyzed {formatDate(analysis.generated_at)}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-[#9CA3AF]">No analysis yet</p>
              )}
              <button
                onClick={handleAnalyze}
                disabled={analyzing || !hasHoldings}
                className="rounded-xl bg-[#00C05A] hover:bg-[#00C05A]/90 text-black font-semibold text-sm px-5 py-2.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {analyzing ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full border-2 border-black border-t-transparent animate-spin" />
                    Analyzing…
                  </span>
                ) : analysis ? "↺ Re-analyze" : "Run Analysis"}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-red-900/20 border border-red-800/30 p-4">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {!hasHoldings && (
          <div className="rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] p-8 text-center">
            <p className="text-[#9CA3AF] mb-2">No portfolio holdings found for this client.</p>
            <p className="text-xs text-[#9CA3AF]">Run seed_data.py to populate holdings.</p>
          </div>
        )}

        {analyzing && (
          <div className="rounded-xl bg-[#1a3a2a] border border-[#00C05A]/30 p-4">
            <p className="text-sm text-[#00C05A] animate-pulse">
              Step 1: Computing drift from holdings… Step 2: GPT-4o interpreting results in life context…
            </p>
          </div>
        )}

        {engineOutput && !analyzing && (
          <>
            {/* Allocation Chart + Drift Table */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="lg:col-span-2 rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A] p-5">
                <h2 className="font-semibold text-white mb-4">Allocation</h2>
                <AllocationChart allocations={engineOutput.allocation_summary} />
              </div>
              <div className="lg:col-span-3 rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A] p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-white">Drift by Asset Class</h2>
                  <p className="text-xs text-[#9CA3AF]">Hover a flagged row for trade estimate</p>
                </div>
                <DriftTable allocations={engineOutput.allocation_summary} />
              </div>
            </div>

            {/* AI Narrative */}
            {analysis && (
              <div className="rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A] p-6">
                <RebalancingPanel
                  analysis={analysis}
                  clientName={client?.name ?? "this client"}
                  onReanalyze={handleAnalyze}
                  loading={analyzing}
                />
              </div>
            )}

            {/* Account Breakdown */}
            <div className="rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A] overflow-hidden">
              <button
                onClick={() => setAccountsOpen(!accountsOpen)}
                className="w-full flex items-center justify-between p-5 hover:bg-[#222] transition-colors text-left"
              >
                <h2 className="font-semibold text-white">Account Breakdown</h2>
                <span className={`text-[#9CA3AF] transition-transform duration-200 ${accountsOpen ? "rotate-180" : ""}`}>▾</span>
              </button>
              {accountsOpen && (
                <div className="border-t border-[#2A2A2A]">
                  {engineOutput.account_breakdown.map((acct) => {
                    const holdings = engineOutput.holdings_by_account?.[acct.account_type] ?? [];
                    return (
                      <div key={acct.account_type} className="border-b border-[#2A2A2A] last:border-0">
                        <div className="flex items-center justify-between px-5 py-3 bg-[#111]">
                          <span className="font-medium text-white text-sm">{acct.account_type}</span>
                          <div className="flex items-center gap-4">
                            <span className="text-xs text-[#9CA3AF]">{(acct.pct_of_portfolio * 100).toFixed(1)}% of portfolio</span>
                            <span className="text-sm font-semibold text-white">{formatCurrency(acct.value)}</span>
                          </div>
                        </div>
                        {holdings.length > 0 && (
                          <div className="px-5 py-2">
                            <table className="w-full text-xs">
                              <tbody>
                                {holdings.map((h, i) => (
                                  <tr key={i} className="border-b border-[#2A2A2A] last:border-0">
                                    <td className="py-2 pr-3 font-mono text-[#9CA3AF]">{h.ticker}</td>
                                    <td className="py-2 pr-3 text-[#9CA3AF] max-w-[200px] truncate">{h.name}</td>
                                    <td className="py-2 pr-3 text-[#9CA3AF]">{h.display_name}</td>
                                    <td className="py-2 text-right text-white font-medium">{formatCurrency(h.current_value)}</td>
                                    <td className="py-2 pl-3 text-right text-[#9CA3AF]">{(h.pct_of_account * 100).toFixed(1)}%</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
