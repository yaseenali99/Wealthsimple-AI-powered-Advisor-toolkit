"use client";

import { ClientPreference } from "@/lib/api";

const CATEGORY_STYLES: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  life_goal: {
    label: "Life Goal",
    bg: "bg-ws-green-dim",
    text: "text-ws-green",
    dot: "bg-ws-green",
  },
  concern: {
    label: "Concern",
    bg: "bg-ws-amber-dim",
    text: "text-ws-amber",
    dot: "bg-ws-amber",
  },
  interest: {
    label: "Interest",
    bg: "bg-ws-blue-dim",
    text: "text-ws-blue",
    dot: "bg-ws-blue",
  },
  constraint: {
    label: "Constraint",
    bg: "bg-ws-purple-dim",
    text: "text-ws-purple",
    dot: "bg-ws-purple",
  },
};

const DEFAULT_STYLE = {
  label: "Other",
  bg: "bg-[#2A2A2A]",
  text: "text-ws-secondary",
  dot: "bg-ws-secondary",
};

interface PreferenceTagProps {
  preference: ClientPreference;
  onDelete?: (id: number) => void;
  meetingDate?: string;
}

export default function PreferenceTag({ preference, onDelete, meetingDate }: PreferenceTagProps) {
  const style = CATEGORY_STYLES[preference.category] ?? DEFAULT_STYLE;

  return (
    <div
      className={`group flex items-start gap-2 rounded-lg px-3 py-2 ${style.bg} border border-transparent transition-all`}
    >
      <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-ws-text leading-snug">{preference.preference}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-xs font-medium ${style.text}`}>{style.label}</span>
          {meetingDate && (
            <span className="text-xs text-ws-secondary">· {meetingDate}</span>
          )}
          {preference.source === "transcript" && (
            <span className="text-xs text-ws-secondary">· extracted</span>
          )}
        </div>
      </div>
      {onDelete && (
        <button
          onClick={() => onDelete(preference.id)}
          className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-ws-secondary hover:text-red-400 text-xs px-1"
          title="Remove preference"
        >
          ✕
        </button>
      )}
    </div>
  );
}
