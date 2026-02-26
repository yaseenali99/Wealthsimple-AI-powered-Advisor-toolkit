"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getClient,
  getMeetings,
  PostCallAnalysis,
  Meeting,
  ClientDetail,
  formatDate,
} from "@/lib/api";
import TranscriptUploader from "@/components/TranscriptUploader";

export default function TranscriptPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const meetingIdParam = searchParams.get("meeting");

  const [client, setClient] = useState<ClientDetail | null>(null);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
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

        let target: Meeting | undefined;
        if (meetingIdParam) {
          target = meetings.find((m) => m.id === Number(meetingIdParam));
        }
        if (!target) {
          // Default to the most recent completed meeting
          target = meetings
            .filter((m) => m.status === "completed")
            .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime())[0];
        }
        if (target) setMeeting(target);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [id, meetingIdParam]);

  function handleAnalysisComplete(_: PostCallAnalysis) {
    showToast("Analysis complete — preferences saved to profile");
    if (meeting?.status !== "completed") {
      setMeeting((m) => m ? { ...m, status: "completed" } : m);
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
            <span className="font-semibold text-ws-text text-sm">Transcript Analysis</span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-ws-text mb-1">Upload Transcript</h1>
          {client && meeting && (
            <p className="text-ws-secondary text-sm">
              {client.name} · {meeting.meeting_type.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())} ·{" "}
              {formatDate(meeting.scheduled_at)}
            </p>
          )}
          {client && !meeting && (
            <p className="text-ws-secondary text-sm">{client.name}</p>
          )}
        </div>

        {error && (
          <div className="rounded-xl bg-red-900/20 border border-red-800/30 p-4 mb-6">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {!meeting && !loading && (
          <div className="rounded-xl bg-ws-surface border border-ws-border p-8 text-center">
            <p className="text-ws-secondary mb-4">No meeting found. Please select a meeting first.</p>
            <Link href={`/clients/${id}`} className="text-ws-green text-sm hover:underline">
              Return to profile
            </Link>
          </div>
        )}

        {meeting && client && (
          <div className="space-y-6">
            {/* Instructions */}
            <div className="rounded-xl bg-ws-surface border border-ws-border p-4">
              <p className="text-sm text-ws-secondary leading-relaxed">
                Paste the meeting transcript below or upload a <code className="bg-ws-surface-2 px-1 rounded text-xs">.txt</code> file.
                The AI will extract a meeting summary, decisions, action items, preferences, and flags.
                Extracted preferences are automatically saved to {client.name}&apos;s profile.
              </p>
            </div>

            {/* Meeting selector */}
            <div className="rounded-xl bg-ws-surface border border-ws-border p-4">
              <p className="text-xs text-ws-secondary uppercase tracking-wide font-medium mb-1">Selected Meeting</p>
              <p className="font-medium text-ws-text">
                {meeting.meeting_type.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())} · {formatDate(meeting.scheduled_at)}
              </p>
              <p className="text-xs text-ws-secondary mt-1">
                Want a different meeting?{" "}
                <Link href={`/clients/${id}`} className="text-ws-green hover:underline">
                  View all meetings
                </Link>
              </p>
            </div>

            {/* Uploader */}
            <TranscriptUploader
              clientId={client.id}
              clientName={client.name}
              clientEmail={client.email}
              meeting={meeting}
              onAnalysisComplete={handleAnalysisComplete}
            />
          </div>
        )}
      </main>
    </div>
  );
}
