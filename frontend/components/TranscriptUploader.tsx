"use client";

import { useState, useRef } from "react";
import {
  uploadTranscript,
  analyzeTranscript,
  draftEmail,
  saveEmailDraft,
  PostCallAnalysis,
  parseJsonField,
  Meeting,
  formatDate,
} from "@/lib/api";

interface ActionItem {
  item: string;
  owner: string;
  due?: string | null;
}

interface ExtractedPreference {
  category: string;
  preference: string;
}

interface TranscriptUploaderProps {
  clientId: number;
  clientName: string;
  clientEmail?: string | null;
  meeting: Meeting;
  onAnalysisComplete: (analysis: PostCallAnalysis) => void;
}

interface EmailDraft {
  subject: string;
  body: string;
}

function EmailDraftPanel({
  analysis,
  clientEmail,
  clientName,
  onSent,
}: {
  analysis: PostCallAnalysis;
  clientEmail?: string | null;
  clientName: string;
  onSent: () => void;
}) {
  const initialDraft: EmailDraft | null = (() => {
    try {
      return analysis.draft_email ? JSON.parse(analysis.draft_email) : null;
    } catch {
      return null;
    }
  })();

  const [draft, setDraft] = useState<EmailDraft | null>(initialDraft);
  const [to, setTo] = useState(clientEmail ?? "");
  const [subject, setSubject] = useState(initialDraft?.subject ?? "");
  const [body, setBody] = useState(initialDraft?.body ?? "");
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    setSent(false);
    try {
      const updated = await draftEmail(analysis.transcript_id);
      const parsed: EmailDraft = updated.draft_email
        ? JSON.parse(updated.draft_email)
        : { subject: "", body: "" };
      setDraft(parsed);
      setSubject(parsed.subject);
      setBody(parsed.body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to draft email");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSend() {
    setSending(true);
    setError(null);
    try {
      await saveEmailDraft(analysis.transcript_id, subject, body);
      setSent(true);
      onSent();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save draft");
    } finally {
      setSending(false);
    }
  }

  function handleCopy() {
    const text = `To: ${to}\nSubject: ${subject}\n\n${body}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (sent) {
    return (
      <div className="rounded-xl bg-ws-green-dim border border-ws-green/30 p-5 flex items-center gap-3">
        <span className="text-ws-green text-lg">✓</span>
        <div>
          <p className="text-sm font-medium text-ws-green">Email sent to {clientName}</p>
          <p className="text-xs text-ws-secondary mt-0.5">Draft saved · {formatDate(new Date().toISOString())}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-ws-surface border border-ws-border overflow-hidden">
      {/* Header row */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-ws-border">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-ws-text">Follow-up Email</span>
          {draft && (
            <span className="text-xs bg-ws-blue-dim text-ws-blue rounded-full px-2 py-0.5 border border-ws-blue/30">
              Draft
            </span>
          )}
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="text-xs text-ws-secondary hover:text-ws-green border border-ws-border hover:border-ws-green/40 rounded-lg px-3 py-1.5 transition-all disabled:opacity-50 flex items-center gap-1.5"
        >
          {generating ? (
            <>
              <span className="h-3 w-3 rounded-full border border-ws-green border-t-transparent animate-spin" />
              Drafting…
            </>
          ) : draft ? (
            "↺ Regenerate"
          ) : (
            "✦ Draft Email"
          )}
        </button>
      </div>

      {!draft && !generating && (
        <div className="px-4 py-6 text-center">
          <p className="text-sm text-ws-secondary mb-3">
            Generate a draft follow-up email based on this meeting&apos;s summary and action items.
          </p>
          <button
            onClick={handleGenerate}
            className="rounded-lg bg-ws-green hover:bg-ws-green/90 text-black font-semibold text-sm px-5 py-2 transition-all"
          >
            ✦ Draft Email
          </button>
        </div>
      )}

      {generating && !draft && (
        <div className="px-4 py-6 space-y-3 animate-pulse">
          <div className="h-3 bg-ws-border rounded w-1/3" />
          <div className="h-3 bg-ws-border rounded w-full" />
          <div className="h-3 bg-ws-border rounded w-5/6" />
          <div className="h-3 bg-ws-border rounded w-4/6" />
        </div>
      )}

      {draft && (
        <div className="p-4 space-y-3">
          {/* To */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-ws-secondary w-14 shrink-0">To</span>
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="flex-1 bg-ws-surface-2 border border-ws-border rounded-lg px-3 py-1.5 text-sm text-ws-text focus:outline-none focus:border-ws-green/60 transition-colors"
            />
          </div>

          {/* Subject */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-ws-secondary w-14 shrink-0">Subject</span>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="flex-1 bg-ws-surface-2 border border-ws-border rounded-lg px-3 py-1.5 text-sm text-ws-text focus:outline-none focus:border-ws-green/60 transition-colors"
            />
          </div>

          {/* Divider */}
          <div className="h-px bg-ws-border" />

          {/* Body */}
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={12}
            className="w-full bg-transparent border-none focus:outline-none text-sm text-ws-secondary leading-relaxed resize-none"
          />

          {error && (
            <p className="text-xs text-red-400 bg-red-900/20 border border-red-800/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleSend}
              disabled={sending || !to.trim()}
              className="rounded-lg bg-ws-green hover:bg-ws-green/90 text-black font-semibold text-sm px-5 py-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {sending ? "Sending…" : "Send Email"}
            </button>
            <button
              onClick={handleCopy}
              className="rounded-lg border border-ws-border hover:border-ws-green/40 text-ws-secondary hover:text-ws-green text-sm px-4 py-2 transition-all"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AnalysisResults({
  analysis,
  clientName,
  clientEmail,
  onEmailSent,
}: {
  analysis: PostCallAnalysis;
  clientName: string;
  clientEmail?: string | null;
  onEmailSent: () => void;
}) {
  const decisions = parseJsonField<string[]>(analysis.decisions_made, []);
  const actionItems = parseJsonField<ActionItem[]>(analysis.action_items, []);
  const preferences = parseJsonField<ExtractedPreference[]>(analysis.extracted_preferences, []);
  const flags = parseJsonField<string[]>(analysis.flags, []);

  const OWNER_STYLES: Record<string, string> = {
    advisor: "bg-ws-blue-dim text-ws-blue",
    client: "bg-ws-purple-dim text-ws-purple",
  };

  return (
    <div className="space-y-5 mt-6">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-ws-border" />
        <span className="text-xs text-ws-secondary uppercase tracking-widest">Analysis Results</span>
        <div className="h-px flex-1 bg-ws-border" />
      </div>

      {/* Summary */}
      {analysis.summary && (
        <div className="rounded-xl bg-ws-surface border border-ws-border p-4">
          <p className="text-xs font-semibold text-ws-secondary uppercase tracking-wide mb-2">Meeting Summary</p>
          <p className="text-sm text-ws-secondary leading-relaxed">{analysis.summary}</p>
        </div>
      )}

      {/* Decisions */}
      {decisions.length > 0 && (
        <div className="rounded-xl bg-ws-surface border border-ws-border p-4">
          <p className="text-xs font-semibold text-ws-secondary uppercase tracking-wide mb-3">Decisions Made</p>
          <ul className="space-y-2">
            {decisions.map((d, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-ws-green" />
                <span className="text-sm text-ws-secondary">{d}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Items */}
      {actionItems.length > 0 && (
        <div className="rounded-xl bg-ws-surface border border-ws-border p-4">
          <p className="text-xs font-semibold text-ws-secondary uppercase tracking-wide mb-3">Action Items</p>
          <ul className="space-y-2">
            {actionItems.map((item, i) => {
              const ownerKey = (item.owner ?? "").toLowerCase();
              const ownerStyle = OWNER_STYLES[ownerKey] ?? "bg-ws-surface-2 text-ws-secondary";
              return (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-0.5 h-4 w-4 shrink-0 rounded border border-ws-border" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-ws-secondary">{item.item}</span>
                    {item.due && (
                      <span className="ml-2 text-xs text-ws-secondary">· due {item.due}</span>
                    )}
                  </div>
                  {item.owner && (
                    <span className={`shrink-0 text-xs font-medium rounded-full px-2 py-0.5 capitalize ${ownerStyle}`}>
                      {item.owner}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Extracted Preferences */}
      {preferences.length > 0 && (
        <div className="rounded-xl bg-ws-green-dim border border-ws-green/30 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-ws-green uppercase tracking-wide">
              Extracted Preferences
            </p>
            <span className="text-xs text-ws-green bg-ws-green-dim rounded-full px-2 py-0.5 border border-ws-green/40">
              Saved to profile
            </span>
          </div>
          <ul className="space-y-2">
            {preferences.map((pref, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-ws-green" />
                <div>
                  <span className="text-sm text-ws-text">{pref.preference}</span>
                  <span className="ml-2 text-xs text-ws-secondary capitalize">[{pref.category?.replace("_", " ")}]</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Flags */}
      {flags.length > 0 && (
        <div className="rounded-xl bg-ws-amber-dim border border-ws-amber/30 p-4">
          <p className="text-xs font-semibold text-ws-amber uppercase tracking-wide mb-3">Flags</p>
          <ul className="space-y-2">
            {flags.map((flag, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-0.5 text-ws-amber text-sm shrink-0">⚠</span>
                <span className="text-sm text-ws-secondary">{flag}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-ws-secondary text-center pb-2">
        Generated {formatDate(analysis.generated_at)} · Flags are surfaced for advisor awareness only. No automated action is taken.
      </p>

      {/* Email draft */}
      <div className="flex items-center gap-3 pt-2">
        <div className="h-px flex-1 bg-ws-border" />
        <span className="text-xs text-ws-secondary uppercase tracking-widest">Follow-up Email</span>
        <div className="h-px flex-1 bg-ws-border" />
      </div>

      <EmailDraftPanel
        analysis={analysis}
        clientName={clientName}
        clientEmail={clientEmail}
        onSent={onEmailSent}
      />
    </div>
  );
}

export default function TranscriptUploader({ clientId, clientName, clientEmail, meeting, onAnalysisComplete }: TranscriptUploaderProps) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "uploading" | "analyzing" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<PostCallAnalysis | null>(null);
  const [emailSentToast, setEmailSentToast] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleEmailSent() {
    setEmailSentToast(true);
    setTimeout(() => setEmailSentToast(false), 4000);
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setText(ev.target?.result as string ?? "");
    reader.readAsText(file);
  };

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setError(null);
    setStatus("uploading");
    try {
      const transcript = await uploadTranscript(clientId, meeting.id, text);
      setStatus("analyzing");
      const result = await analyzeTranscript(transcript.id);
      setAnalysis(result);
      setStatus("done");
      onAnalysisComplete(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  };

  const isLoading = status === "uploading" || status === "analyzing";

  return (
    <div className="space-y-4">
      {/* File upload */}
      <div>
        <input
          ref={fileRef}
          type="file"
          accept=".txt"
          onChange={handleFile}
          className="hidden"
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={isLoading}
          className="text-sm text-ws-secondary hover:text-ws-green border border-ws-border hover:border-ws-green/40 rounded-lg px-3 py-2 transition-all disabled:opacity-50"
        >
          ↑ Upload .txt file
        </button>
        {text && (
          <span className="ml-3 text-xs text-ws-secondary">
            {text.length.toLocaleString()} characters loaded
          </span>
        )}
      </div>

      {/* Textarea */}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={isLoading}
        placeholder="Paste your meeting transcript here…"
        className="w-full min-h-[240px] rounded-xl bg-ws-surface border border-ws-border focus:border-ws-green/60 focus:outline-none p-4 text-sm text-ws-secondary placeholder-[#555] resize-y transition-colors disabled:opacity-60"
      />

      {/* Status / error */}
      {status === "uploading" && (
        <p className="text-sm text-ws-secondary animate-pulse">Saving transcript…</p>
      )}
      {status === "analyzing" && (
        <div className="rounded-lg bg-ws-green-dim border border-ws-green/30 p-3">
          <p className="text-sm text-ws-green animate-pulse">
            AI is analyzing the transcript — extracting preferences, action items, and flags…
          </p>
        </div>
      )}
      {error && (
        <p className="text-sm text-red-400 bg-red-900/20 border border-red-800/30 rounded-lg p-3">{error}</p>
      )}

      {/* Submit */}
      {status !== "done" && (
        <button
          onClick={handleSubmit}
          disabled={isLoading || !text.trim()}
          className="w-full rounded-xl bg-ws-green hover:bg-ws-green/90 text-black font-semibold text-sm py-3 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isLoading ? "Processing…" : "Analyze Transcript"}
        </button>
      )}

      {/* Email sent toast */}
      {emailSentToast && (
        <div className="rounded-lg bg-ws-green-dim border border-ws-green/30 px-4 py-3 flex items-center gap-2">
          <span className="text-ws-green">✓</span>
          <span className="text-sm text-ws-green">Email sent to {clientName}</span>
        </div>
      )}

      {/* Analysis */}
      {analysis && (
        <AnalysisResults
          analysis={analysis}
          clientName={clientName}
          clientEmail={clientEmail}
          onEmailSent={handleEmailSent}
        />
      )}
    </div>
  );
}
