"use client";

import { useState } from "react";
import { Brief, parseJsonField, formatDate } from "@/lib/api";

interface Section {
  id: string;
  title: string;
  icon: string;
  content: React.ReactNode;
  isEmpty: boolean;
}

function Accordion({ section }: { section: Section }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="rounded-xl border border-ws-border bg-ws-surface overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 hover:bg-ws-surface-2 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">{section.icon}</span>
          <span className="font-semibold text-ws-text">{section.title}</span>
        </div>
        <span className={`text-ws-secondary transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-ws-border">
          {section.isEmpty ? (
            <p className="text-sm text-ws-secondary italic">None recorded.</p>
          ) : (
            section.content
          )}
        </div>
      )}
    </div>
  );
}

interface BriefPanelProps {
  brief: Brief;
  onRegenerate: () => void;
  loading: boolean;
}

export default function BriefPanel({ brief, onRegenerate, loading }: BriefPanelProps) {
  const talkingPoints = parseJsonField<string[]>(brief.talking_points, []);
  const flags = parseJsonField<string[]>(brief.flags, []);
  const actionItems = parseJsonField<string[]>(brief.action_items, []);
  const preferenceReminders = parseJsonField<string[]>((brief as unknown as Record<string, string>)["preference_reminders"], []);
  const portfolioFlags = parseJsonField<string[]>(brief.portfolio_flags, []);

  const sections: Section[] = [
    {
      id: "snapshot",
      title: "Client Snapshot",
      icon: "👤",
      isEmpty: !brief.summary,
      content: <p className="text-sm text-ws-secondary leading-relaxed">{brief.summary}</p>,
    },
    {
      id: "talking_points",
      title: "Talking Points",
      icon: "💬",
      isEmpty: talkingPoints.length === 0,
      content: (
        <ul className="space-y-2">
          {talkingPoints.map((point, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-ws-green-dim text-ws-green text-xs flex items-center justify-center font-semibold">
                {i + 1}
              </span>
              <span className="text-sm text-ws-secondary leading-relaxed">{point}</span>
            </li>
          ))}
        </ul>
      ),
    },
    {
      id: "flags",
      title: "Flags",
      icon: "⚑",
      isEmpty: flags.length === 0,
      content: (
        <ul className="space-y-2">
          {flags.map((flag, i) => (
            <li key={i} className="flex items-start gap-3 rounded-lg bg-ws-amber-dim border border-ws-amber/30 px-3 py-2">
              <span className="mt-0.5 text-ws-amber shrink-0">⚠</span>
              <span className="text-sm text-ws-secondary leading-relaxed">{flag}</span>
            </li>
          ))}
        </ul>
      ),
    },
    {
      id: "action_items",
      title: "Open Action Items",
      icon: "✓",
      isEmpty: actionItems.length === 0,
      content: (
        <ul className="space-y-2">
          {actionItems.map((item, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="mt-0.5 h-4 w-4 shrink-0 rounded border border-ws-border" />
              <span className="text-sm text-ws-secondary leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      ),
    },
    {
      id: "portfolio",
      title: "Portfolio Flags",
      icon: "📊",
      isEmpty: portfolioFlags.length === 0,
      content: (
        <ul className="space-y-2">
          {portfolioFlags.map((flag, i) => (
            <li key={i} className="flex items-start gap-3 rounded-lg bg-ws-blue-dim border border-ws-blue/20 px-3 py-2">
              <span className="mt-0.5 text-ws-blue shrink-0 text-sm">◈</span>
              <span className="text-sm text-ws-secondary leading-relaxed">{flag}</span>
            </li>
          ))}
        </ul>
      ),
    },
    {
      id: "preferences",
      title: "Preference Reminders",
      icon: "★",
      isEmpty: preferenceReminders.length === 0,
      content: (
        <ul className="space-y-2">
          {preferenceReminders.map((reminder, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="mt-0.5 text-ws-green shrink-0 text-sm">★</span>
              <span className="text-sm text-ws-secondary leading-relaxed">{reminder}</span>
            </li>
          ))}
        </ul>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Meta bar */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-ws-secondary">
          Generated {formatDate(brief.generated_at)}
        </p>
        <button
          onClick={onRegenerate}
          disabled={loading}
          className="text-xs font-medium text-ws-green hover:text-ws-green/80 border border-ws-green/40 hover:border-ws-green rounded-lg px-3 py-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Regenerating…" : "↺ Regenerate"}
        </button>
      </div>

      {/* Sections */}
      {sections.map((section) => (
        <Accordion key={section.id} section={section} />
      ))}

      {/* How this works panel */}
      <div className="rounded-xl border border-ws-border bg-ws-surface p-4 mt-6">
        <div className="flex items-start gap-3">
          <span className="text-lg shrink-0">ℹ</span>
          <div>
            <p className="text-sm font-semibold text-ws-text mb-1">How this works</p>
            <p className="text-xs text-ws-secondary leading-relaxed">
              This brief was generated by AI from the client&apos;s profile, extracted preferences, and past meeting analyses.
              It is intended to support the advisor&apos;s preparation — not to replace advisor judgment.
              The AI does not recommend specific products, draft client communications, or make assumptions
              beyond what is explicitly recorded. All relationship decisions, financial recommendations,
              and compliance-sensitive actions remain entirely with the advisor.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
