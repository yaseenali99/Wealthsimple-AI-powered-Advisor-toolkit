"use client";

import Link from "next/link";
import { Meeting, formatDate } from "@/lib/api";

const TYPE_LABELS: Record<string, string> = {
  quarterly_review: "Quarterly Review",
  onboarding: "Onboarding",
  ad_hoc: "Ad Hoc",
};

interface MeetingTimelineProps {
  meetings: Meeting[];
  clientId: number;
}

export default function MeetingTimeline({ meetings, clientId }: MeetingTimelineProps) {
  const sorted = [...meetings].sort(
    (a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime()
  );

  if (sorted.length === 0) {
    return (
      <p className="text-sm text-ws-secondary py-4">No meetings on record.</p>
    );
  }

  return (
    <div className="relative">
      <div className="absolute left-3 top-0 bottom-0 w-px bg-ws-border" />
      <div className="space-y-3">
        {sorted.map((meeting) => {
          const isUpcoming = meeting.status === "upcoming";
          return (
            <div key={meeting.id} className="relative flex items-start gap-4 pl-9">
              {/* Timeline dot */}
              <div
                className={`absolute left-1.5 top-1.5 h-3 w-3 rounded-full border-2 ${
                  isUpcoming
                    ? "border-ws-green bg-ws-green/30"
                    : "border-ws-border bg-ws-surface-2"
                }`}
              />

              <div className="flex-1 min-w-0 rounded-lg bg-ws-surface border border-ws-border p-3 hover:border-ws-border/60 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-ws-text">
                      {TYPE_LABELS[meeting.meeting_type] ?? meeting.meeting_type}
                    </p>
                    <p className="text-xs text-ws-secondary mt-0.5">
                      {formatDate(meeting.scheduled_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-xs font-medium rounded-full px-2 py-0.5 ${
                        isUpcoming
                          ? "bg-ws-green-dim text-ws-green"
                          : "bg-ws-surface-2 text-ws-secondary"
                      }`}
                    >
                      {isUpcoming ? "Upcoming" : "Completed"}
                    </span>
                    {!isUpcoming && (
                      <>
                        <Link
                          href={`/clients/${clientId}/transcript?meeting=${meeting.id}`}
                          className="text-xs text-ws-secondary hover:text-ws-green transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Analysis →
                        </Link>
                        <Link
                          href={`/clients/${clientId}/transcript?meeting=${meeting.id}`}
                          className="text-xs text-ws-secondary hover:text-ws-green transition-colors border-l border-ws-border pl-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Upload →
                        </Link>
                      </>
                    )}
                    {isUpcoming && (
                      <>
                        <Link
                          href={`/clients/${clientId}/brief?meeting=${meeting.id}`}
                          className="text-xs text-ws-green hover:text-ws-green/80 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Brief →
                        </Link>
                        <Link
                          href={`/clients/${clientId}/transcript?meeting=${meeting.id}`}
                          className="text-xs text-ws-secondary hover:text-ws-green transition-colors border-l border-ws-border pl-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Upload →
                        </Link>
                      </>
                    )}
                  </div>
                </div>
                {meeting.advisor_notes && (
                  <p className="mt-2 text-xs text-ws-secondary border-t border-ws-border pt-2 line-clamp-2">
                    {meeting.advisor_notes}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
