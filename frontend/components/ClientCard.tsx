"use client";

import Link from "next/link";
import { ClientListItem, formatCurrency, formatDate, daysUntil } from "@/lib/api";

const RISK_STYLES: Record<string, string> = {
  conservative: "bg-[#1a3a2a] text-ws-green border-ws-green",
  balanced:     "bg-[#1a2a3a] text-ws-blue border-ws-blue",
  growth:       "bg-[#2a1a3a] text-ws-purple border-ws-purple",
  aggressive:   "bg-[#3a1a1a] text-red-400 border-red-400",
};

function StatusBadge({ client }: { client: ClientListItem }) {
  if (!client.next_meeting) return null;

  const days = daysUntil(client.next_meeting.scheduled_at);

  if (days >= 0 && days <= 7) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-ws-amber-dim border border-ws-amber text-ws-amber text-xs font-medium px-2 py-0.5">
        <span className="h-1.5 w-1.5 rounded-full bg-ws-amber animate-pulse" />
        Meeting Soon
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#1a3a2a] border border-ws-green/40 text-ws-green text-xs font-medium px-2 py-0.5">
      Upcoming
    </span>
  );
}

export default function ClientCard({ client }: { client: ClientListItem }) {
  const riskStyle = RISK_STYLES[client.risk_profile ?? ""] ?? "bg-[#2A2A2A] text-ws-secondary border-ws-border";
  const accounts: string[] = (() => {
    try { return JSON.parse(client.accounts ?? "[]"); }
    catch { return []; }
  })();

  return (
    <Link href={`/clients/${client.id}`}>
      <div className="group relative flex flex-col gap-4 rounded-xl bg-ws-surface border border-ws-border hover:border-ws-green/60 transition-all duration-200 p-5 cursor-pointer h-full">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-ws-text truncate">{client.name}</h3>
            <p className="text-sm text-ws-secondary mt-0.5">
              {client.age ? `${client.age} · ` : ""}{client.occupation ?? "—"}
            </p>
          </div>
          <span className={`shrink-0 text-xs font-medium border rounded-full px-2 py-0.5 capitalize ${riskStyle}`}>
            {client.risk_profile ?? "—"}
          </span>
        </div>

        {/* Portfolio Value + Drift Dot */}
        <div>
          <p className="text-xs text-ws-secondary uppercase tracking-wide mb-1">Portfolio</p>
          <div className="flex items-center gap-2">
            <p className="text-xl font-semibold text-ws-text">{formatCurrency(client.portfolio_value)}</p>
            {client.drift_score != null && (
              <span
                title={`Drift score: ${client.drift_score}/100${client.drift_analyzed_at ? ` — last analyzed ${formatDate(client.drift_analyzed_at)}` : ""}`}
                className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                  client.drift_score > 40 ? "bg-red-400" :
                  client.drift_score > 20 ? "bg-[#F59E0B]" :
                  "bg-ws-green"
                }`}
              />
            )}
          </div>
        </div>

        {/* Accounts */}
        {accounts.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {accounts.map((acc) => (
              <span key={acc} className="rounded bg-ws-surface-2 border border-ws-border text-xs text-ws-secondary px-2 py-0.5">
                {acc}
              </span>
            ))}
          </div>
        )}

        {/* Meeting dates */}
        <div className="mt-auto pt-3 border-t border-ws-border flex items-end justify-between gap-2">
          <div className="text-xs text-ws-secondary space-y-0.5">
            {client.next_meeting && (
              <p>Next: <span className="text-ws-text">{formatDate(client.next_meeting.scheduled_at)}</span></p>
            )}
            {client.last_meeting && (
              <p>Last: <span className="text-ws-text">{formatDate(client.last_meeting.scheduled_at)}</span></p>
            )}
            {!client.next_meeting && !client.last_meeting && (
              <p className="text-ws-secondary">No meetings scheduled</p>
            )}
          </div>
          <StatusBadge client={client} />
        </div>
      </div>
    </Link>
  );
}
