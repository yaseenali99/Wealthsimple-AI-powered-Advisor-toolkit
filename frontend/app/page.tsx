"use client";

import { useEffect, useState } from "react";
import { getClients, ClientListItem } from "@/lib/api";
import ClientCard from "@/components/ClientCard";

function SkeletonCard() {
  return (
    <div className="rounded-xl bg-ws-surface border border-ws-border p-5 h-56 animate-pulse">
      <div className="h-4 bg-ws-border rounded w-3/4 mb-2" />
      <div className="h-3 bg-ws-border rounded w-1/2 mb-6" />
      <div className="h-6 bg-ws-border rounded w-2/5 mb-4" />
      <div className="flex gap-1.5 mb-6">
        <div className="h-5 w-12 bg-ws-border rounded" />
        <div className="h-5 w-10 bg-ws-border rounded" />
      </div>
      <div className="h-px bg-ws-border mb-3" />
      <div className="h-3 bg-ws-border rounded w-1/3" />
    </div>
  );
}

export default function DashboardPage() {
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [needsRebalancing, setNeedsRebalancing] = useState(false);

  useEffect(() => {
    getClients()
      .then(setClients)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = clients.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = !needsRebalancing || (c.drift_score != null && c.drift_score > 40);
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen bg-ws-bg">
      {/* Header */}
      <header className="border-b border-ws-border bg-ws-surface/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-lg bg-ws-green flex items-center justify-center">
              <span className="text-black font-bold text-sm">W</span>
            </div>
            <div>
              <h1 className="font-semibold text-ws-text leading-none">Advisor Prep</h1>
              <p className="text-xs text-ws-secondary mt-0.5">Wealthsimple · AI-assisted</p>
            </div>
          </div>
          <span className="text-xs text-ws-secondary hidden sm:block">
            {clients.length > 0 ? `${clients.length} clients` : ""}
          </span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Page title + search */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
          <div className="flex-1">
            <h2 className="text-2xl font-semibold text-ws-text">Your Clients</h2>
            <p className="text-sm text-ws-secondary mt-1">
              Select a client to view their profile, generate a brief, or upload a transcript.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setNeedsRebalancing(!needsRebalancing)}
              className={`text-xs font-medium border rounded-xl px-3 py-2.5 transition-all whitespace-nowrap ${
                needsRebalancing
                  ? "bg-red-900/30 text-red-400 border-red-800/40"
                  : "bg-ws-surface text-ws-secondary border-ws-border hover:border-ws-border/60"
              }`}
            >
              {needsRebalancing ? "✕ " : ""}Needs Rebalancing
            </button>
            <input
              type="text"
              placeholder="Search clients…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-56 rounded-xl bg-ws-surface border border-ws-border focus:border-ws-green/60 focus:outline-none px-4 py-2.5 text-sm text-ws-text placeholder-[#555] transition-colors"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl bg-red-900/20 border border-red-800/30 p-4 mb-6">
            <p className="text-sm text-red-400">Failed to load clients: {error}</p>
            <p className="text-xs text-ws-secondary mt-1">Make sure the backend is running on localhost:8000</p>
          </div>
        )}

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
            : filtered.length === 0
            ? (
              <div className="col-span-full text-center py-16 text-ws-secondary">
                {search ? `No clients match "${search}"` : "No clients found. Run seed_data.py to add demo data."}
              </div>
            )
            : filtered.map((client) => (
              <ClientCard key={client.id} client={client} />
            ))
          }
        </div>
      </main>
    </div>
  );
}
