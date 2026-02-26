"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getClient,
  getPortfolio,
  deletePreference,
  ClientDetail,
  ClientPreference,
  Meeting,
  PortfolioData,
  EngineOutput,
  parseJsonField,
  formatCurrency,
  formatDate,
  daysUntil,
} from "@/lib/api";
import PreferenceTag from "@/components/PreferenceTag";
import MeetingTimeline from "@/components/MeetingTimeline";

const RISK_STYLES: Record<string, string> = {
  conservative: "bg-[#1a3a2a] text-ws-green border-ws-green",
  balanced:     "bg-[#1a2a3a] text-ws-blue border-ws-blue",
  growth:       "bg-[#2a1a3a] text-ws-purple border-ws-purple",
  aggressive:   "bg-[#3a1a1a] text-red-400 border-red-400",
};

const CATEGORY_ORDER = ["life_goal", "concern", "interest", "constraint"];
const CATEGORY_LABELS: Record<string, string> = {
  life_goal: "Life Goals",
  concern: "Concerns",
  interest: "Interests",
  constraint: "Constraints",
};

export default function ClientProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getClient(Number(id)),
      getPortfolio(Number(id)).catch(() => null),
    ])
      .then(([clientData, portData]) => {
        setClient(clientData);
        setPortfolioData(portData);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function handleDeletePreference(prefId: number) {
    await deletePreference(prefId);
    setClient((prev) =>
      prev ? { ...prev, preferences: prev.preferences.filter((p) => p.id !== prefId) } : prev
    );
    showToast("Preference removed");
  }

  const nextMeeting: Meeting | undefined = client?.meetings
    .filter((m) => m.status === "upcoming")
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0];

  const prefsByCategory = CATEGORY_ORDER.reduce<Record<string, ClientPreference[]>>((acc, cat) => {
    acc[cat] = client?.preferences.filter((p) => p.category === cat) ?? [];
    return acc;
  }, {});

  const accounts: string[] = (() => {
    try { return JSON.parse(client?.accounts ?? "[]"); } catch { return []; }
  })();

  if (loading) {
    return (
      <div className="min-h-screen bg-ws-bg flex items-center justify-center">
        <div className="text-ws-secondary animate-pulse">Loading client profile…</div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="min-h-screen bg-ws-bg flex items-center justify-center flex-col gap-4">
        <p className="text-red-400">{error ?? "Client not found"}</p>
        <Link href="/" className="text-ws-green text-sm hover:underline">← Back to dashboard</Link>
      </div>
    );
  }

  const riskStyle = RISK_STYLES[client.risk_profile ?? ""] ?? "bg-[#2A2A2A] text-ws-secondary border-ws-border";

  return (
    <div className="min-h-screen bg-ws-bg">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-ws-surface border border-ws-border rounded-xl px-4 py-3 text-sm text-ws-text shadow-lg animate-in fade-in">
          {toast}
        </div>
      )}

      {/* Header */}
      <header className="border-b border-ws-border bg-ws-surface/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <button onClick={() => router.push("/")} className="text-ws-secondary hover:text-ws-text transition-colors text-sm">
            ← Dashboard
          </button>
          <div className="h-4 w-px bg-ws-border" />
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-lg bg-ws-green flex items-center justify-center">
              <span className="text-black font-bold text-sm">W</span>
            </div>
            <span className="font-semibold text-ws-text text-sm">Advisor Prep</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Client header card */}
        <div className="rounded-2xl bg-ws-surface border border-ws-border p-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="h-16 w-16 rounded-2xl bg-ws-green-dim border border-ws-green/30 flex items-center justify-center text-2xl font-bold text-ws-green shrink-0">
              {client.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-1">
                <h1 className="text-2xl font-semibold text-ws-text">{client.name}</h1>
                <span className={`text-xs font-medium border rounded-full px-2.5 py-1 capitalize ${riskStyle}`}>
                  {client.risk_profile}
                </span>
              </div>
              <p className="text-ws-secondary">
                {client.age ? `${client.age} · ` : ""}{client.occupation ?? "—"}
                {client.email ? ` · ${client.email}` : ""}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {accounts.map((acc) => (
                  <span key={acc} className="rounded-lg bg-ws-surface-2 border border-ws-border text-xs text-ws-secondary px-2.5 py-1">
                    {acc}
                  </span>
                ))}
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-ws-secondary mb-1">Portfolio Value</p>
              <p className="text-2xl font-semibold text-ws-text">{formatCurrency(client.portfolio_value)}</p>
            </div>
          </div>
        </div>

        {/* Portfolio Snapshot Widget */}
        {(() => {
          const eng = portfolioData?.analysis
            ? parseJsonField<EngineOutput>(portfolioData.analysis.portfolio_summary, null as unknown as EngineOutput)
            : null;
          const score = eng?.drift_score ?? null;
          const urgency = portfolioData?.analysis?.overall_urgency ?? null;
          const dotColor = score == null ? "" : score > 40 ? "bg-red-400" : score > 20 ? "bg-[#F59E0B]" : "bg-[#00C05A]";
          const badgeStyle = score == null ? "" : score > 40 ? "bg-red-900/20 text-red-400 border-red-800/30" : score > 20 ? "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30" : "bg-[#1a3a2a] text-[#00C05A] border-[#00C05A]/30";

          return (
            <div className="rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A] p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-[#9CA3AF] uppercase tracking-wide mb-2">Portfolio Snapshot</p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <p className="text-2xl font-semibold text-white">{formatCurrency(client?.portfolio_value)}</p>
                    {score != null && (
                      <span className={`inline-flex items-center gap-1.5 border rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeStyle}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
                        Drift {score}/100
                      </span>
                    )}
                    {!portfolioData?.analysis && (
                      <span className="text-xs text-[#9CA3AF] border border-[#2A2A2A] rounded-full px-2.5 py-0.5">
                        Not analyzed
                      </span>
                    )}
                  </div>
                  {/* Mini allocation bar */}
                  {eng && (
                    <div className="flex gap-0.5 mt-3 h-2 rounded-full overflow-hidden w-full max-w-xs">
                      {eng.allocation_summary.filter(a => a.actual_pct > 0).map(a => {
                        const colors: Record<string, string> = { us_equity: "#3B82F6", canadian_equity: "#00C05A", intl_equity: "#A855F7", canadian_bond: "#F59E0B", cash: "#6B7280", real_estate: "#EC4899", alternative: "#6366F1" };
                        return (
                          <div
                            key={a.asset_class}
                            title={`${a.display_name}: ${(a.actual_pct * 100).toFixed(1)}%`}
                            style={{ width: `${a.actual_pct * 100}%`, backgroundColor: colors[a.asset_class] ?? "#4B5563" }}
                          />
                        );
                      })}
                    </div>
                  )}
                  {portfolioData?.analysis && (
                    <p className="text-xs text-[#9CA3AF] mt-1">
                      Analyzed {formatDate(portfolioData.analysis.generated_at)}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-2 items-start sm:items-end">
                  {urgency && urgency !== "low" && (
                    <div className="rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/30 px-3 py-2">
                      <p className="text-xs text-[#F59E0B] font-medium">Portfolio needs review before next meeting</p>
                    </div>
                  )}
                  <Link
                    href={`/clients/${client?.id}/portfolio`}
                    className="text-sm font-medium text-[#00C05A] hover:text-[#00C05A]/80 transition-colors"
                  >
                    View Full Portfolio →
                  </Link>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Next meeting CTA */}
        {nextMeeting && (
          <div className="rounded-2xl bg-ws-green-dim border border-ws-green/30 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs text-ws-green uppercase tracking-wide font-semibold mb-1">Next Meeting</p>
              <p className="font-semibold text-ws-text">
                {nextMeeting.meeting_type.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </p>
              <p className="text-sm text-ws-secondary mt-0.5">
                {new Date(nextMeeting.scheduled_at).toLocaleDateString("en-CA", {
                  weekday: "long", month: "long", day: "numeric", year: "numeric"
                })}
                {daysUntil(nextMeeting.scheduled_at) <= 7 && daysUntil(nextMeeting.scheduled_at) >= 0 && (
                  <span className="ml-2 text-ws-amber font-medium">· in {daysUntil(nextMeeting.scheduled_at)} days</span>
                )}
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href={`/clients/${client.id}/transcript?meeting=${nextMeeting.id}`}
                className="rounded-xl border border-ws-green/40 text-ws-green hover:bg-ws-green-dim text-sm font-medium px-4 py-2.5 transition-all"
              >
                Upload Transcript
              </Link>
              <Link
                href={`/clients/${client.id}/brief?meeting=${nextMeeting.id}`}
                className="rounded-xl bg-ws-green hover:bg-ws-green/90 text-black font-semibold text-sm px-5 py-2.5 transition-all"
              >
                Generate Brief →
              </Link>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Preferences column */}
          <div className="lg:col-span-3 space-y-5">
            <h2 className="text-lg font-semibold text-ws-text">Client Preferences</h2>
            {CATEGORY_ORDER.map((cat) => {
              const prefs = prefsByCategory[cat];
              if (prefs.length === 0) return null;
              return (
                <div key={cat}>
                  <p className="text-xs text-ws-secondary uppercase tracking-wider font-medium mb-2">
                    {CATEGORY_LABELS[cat]}
                  </p>
                  <div className="space-y-2">
                    {prefs.map((pref) => (
                      <PreferenceTag
                        key={pref.id}
                        preference={pref}
                        onDelete={handleDeletePreference}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
            {client.preferences.length === 0 && (
              <p className="text-sm text-ws-secondary py-4">
                No preferences recorded yet. Upload a transcript to extract them automatically.
              </p>
            )}
          </div>

          {/* Meeting timeline column */}
          <div className="lg:col-span-2 space-y-5">
            <h2 className="text-lg font-semibold text-ws-text">Meeting History</h2>
            <MeetingTimeline meetings={client.meetings} clientId={client.id} />
          </div>
        </div>
      </main>
    </div>
  );
}
