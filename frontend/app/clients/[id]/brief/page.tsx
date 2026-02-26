"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getClient,
  getMeetings,
  generateBrief,
  getBrief,
  Brief,
  Meeting,
  ClientDetail,
  formatDate,
} from "@/lib/api";
import BriefPanel from "@/components/BriefPanel";

function SkeletonBrief() {
  return (
    <div className="space-y-4 animate-pulse">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="rounded-xl bg-ws-surface border border-ws-border p-4">
          <div className="h-4 bg-ws-border rounded w-1/3 mb-3" />
          <div className="space-y-2">
            <div className="h-3 bg-ws-border rounded w-full" />
            <div className="h-3 bg-ws-border rounded w-5/6" />
            <div className="h-3 bg-ws-border rounded w-4/6" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function BriefPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const meetingIdParam = searchParams.get("meeting");

  const [client, setClient] = useState<ClientDetail | null>(null);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [brief, setBrief] = useState<Brief | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  useEffect(() => {
    async function init() {
      try {
        const [clientData, meetings] = await Promise.all([
          getClient(Number(id)),
          getMeetings(Number(id)),
        ]);
        setClient(clientData);

        let targetMeeting: Meeting | undefined;
        if (meetingIdParam) {
          targetMeeting = meetings.find((m) => m.id === Number(meetingIdParam));
        }
        if (!targetMeeting) {
          targetMeeting = meetings.find((m) => m.status === "upcoming");
        }
        if (targetMeeting) {
          setMeeting(targetMeeting);
          try {
            const existingBrief = await getBrief(targetMeeting.id);
            setBrief(existingBrief);
          } catch {
            // No brief yet — that's fine
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [id, meetingIdParam]);

  async function handleGenerate() {
    if (!client || !meeting) return;
    setGenerating(true);
    setError(null);
    try {
      const result = await generateBrief(client.id, meeting.id);
      setBrief(result);
      showToast("Brief generated successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-ws-bg flex items-center justify-center">
        <p className="text-ws-secondary animate-pulse">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ws-bg">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-ws-surface border border-ws-green/40 text-ws-green rounded-xl px-4 py-3 text-sm shadow-lg">
          ✓ {toast}
        </div>
      )}

      {/* Header */}
      <header className="border-b border-ws-border bg-ws-surface/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => router.push(`/clients/${id}`)}
            className="text-ws-secondary hover:text-ws-text transition-colors text-sm"
          >
            ← {client?.name ?? "Client"}
          </button>
          <div className="h-4 w-px bg-ws-border" />
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-lg bg-ws-green flex items-center justify-center">
              <span className="text-black font-bold text-sm">W</span>
            </div>
            <span className="font-semibold text-ws-text text-sm">Pre-Meeting Brief</span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-ws-text mb-1">Pre-Meeting Brief</h1>
          {client && meeting && (
            <p className="text-ws-secondary text-sm">
              {client.name} · {meeting.meeting_type.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())} ·{" "}
              {formatDate(meeting.scheduled_at)}
            </p>
          )}
        </div>

        {error && (
          <div className="rounded-xl bg-red-900/20 border border-red-800/30 p-4 mb-6">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {!meeting && !loading && (
          <div className="rounded-xl bg-ws-surface border border-ws-border p-8 text-center">
            <p className="text-ws-secondary mb-4">No upcoming meeting found for this client.</p>
            <Link href={`/clients/${id}`} className="text-ws-green text-sm hover:underline">
              Return to profile
            </Link>
          </div>
        )}

        {meeting && !brief && !generating && (
          <div className="rounded-2xl bg-ws-surface border border-ws-border p-8 text-center">
            <div className="h-16 w-16 rounded-2xl bg-ws-green-dim border border-ws-green/30 flex items-center justify-center text-2xl mx-auto mb-4">
              📋
            </div>
            <h2 className="font-semibold text-ws-text mb-2">No brief yet</h2>
            <p className="text-sm text-ws-secondary mb-6">
              Generate an AI-powered brief based on {client?.name}&apos;s profile, preferences, and meeting history.
            </p>
            <button
              onClick={handleGenerate}
              className="rounded-xl bg-ws-green hover:bg-ws-green/90 text-black font-semibold px-8 py-3 transition-all"
            >
              Generate Brief
            </button>
          </div>
        )}

        {generating && (
          <div className="space-y-4">
            <div className="rounded-xl bg-ws-green-dim border border-ws-green/30 p-4 flex items-center gap-3">
              <div className="h-4 w-4 rounded-full border-2 border-ws-green border-t-transparent animate-spin shrink-0" />
              <p className="text-sm text-ws-green">AI is generating your brief — typically takes 5-10 seconds…</p>
            </div>
            <SkeletonBrief />
          </div>
        )}

        {brief && !generating && (
          <BriefPanel brief={brief} onRegenerate={handleGenerate} loading={generating} />
        )}
      </main>
    </div>
  );
}
