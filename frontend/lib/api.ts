const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error");
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface Meeting {
  id: number;
  client_id: number;
  scheduled_at: string;
  meeting_type: string;
  status: string;
  advisor_notes: string | null;
  created_at: string;
}

export interface ClientPreference {
  id: number;
  client_id: number;
  category: string;
  preference: string;
  source: string;
  meeting_id: number | null;
  created_at: string;
}

export interface Client {
  id: number;
  name: string;
  email: string | null;
  age: number | null;
  occupation: string | null;
  risk_profile: string | null;
  accounts: string | null; // JSON string
  portfolio_value: number | null;
  created_at: string;
  updated_at: string;
}

export interface ClientListItem extends Client {
  next_meeting: Meeting | null;
  last_meeting: Meeting | null;
  drift_score?: number | null;
  drift_analyzed_at?: string | null;
}

export interface ClientDetail extends Client {
  preferences: ClientPreference[];
  meetings: Meeting[];
}

export interface Brief {
  id: number;
  client_id: number;
  meeting_id: number;
  generated_at: string;
  summary: string | null;
  talking_points: string | null;   // JSON string
  flags: string | null;
  action_items: string | null;
  portfolio_flags: string | null;  // JSON string
  market_context: string | null;
}

export interface Transcript {
  id: number;
  client_id: number;
  meeting_id: number;
  raw_text: string;
  uploaded_at: string;
  processed: boolean;
}

export interface PortfolioHolding {
  id: number;
  account_type: string;
  asset_class: string;
  ticker: string;
  name: string;
  units: number | null;
  current_price: number | null;
  current_value: number;
  as_of_date: string | null;
}

export interface TargetAllocation {
  id: number;
  account_type: string | null;
  asset_class: string;
  target_pct: number;
  drift_threshold: number;
}

export interface AllocationItem {
  asset_class: string;
  display_name: string;
  target_pct: number;
  actual_pct: number;
  drift_pct: number;
  drift_value: number;
  actual_value: number;
  flagged: boolean;
  trade_estimate: number;
}

export interface AccountBreakdown {
  account_type: string;
  value: number;
  pct_of_portfolio: number;
}

export interface EngineOutput {
  total_portfolio_value: number;
  as_of_date: string;
  drift_score: number;
  account_breakdown: AccountBreakdown[];
  holdings_by_account: Record<string, Array<{ticker: string; name: string; asset_class: string; display_name: string; current_value: number; pct_of_account: number}>>;
  allocation_summary: AllocationItem[];
  flagged_items: string[];
  error?: string;
}

export interface ContextFlag {
  flag: string;
  context: string;
  urgency: "low" | "medium" | "high";
  suggested_question: string;
}

export interface RebalancingAnalysis {
  id: number;
  generated_at: string;
  portfolio_summary: string | null;   // JSON string → EngineOutput
  drift_flags: string | null;         // JSON string → string[]
  ai_narrative: string | null;
  context_flags: string | null;       // JSON string → ContextFlag[]
  overall_urgency: string | null;
  no_action_needed: boolean;
  last_rebalanced: string | null;
}

export interface PortfolioData {
  client_id: number;
  holdings: PortfolioHolding[];
  targets: TargetAllocation[];
  analysis: RebalancingAnalysis | null;
}

export interface PostCallAnalysis {
  id: number;
  transcript_id: number;
  client_id: number;
  meeting_id: number;
  summary: string | null;
  decisions_made: string | null;  // JSON string
  action_items: string | null;    // JSON string
  extracted_preferences: string | null; // JSON string
  flags: string | null;
  draft_email: string | null;     // JSON string: {"subject": "...", "body": "..."}
  generated_at: string;
}

// ── Clients ───────────────────────────────────────────────────────────────────

export const getClients = () => apiFetch<ClientListItem[]>("/api/clients");

export const getClient = (id: number) =>
  apiFetch<ClientDetail>(`/api/clients/${id}`);

// ── Meetings ──────────────────────────────────────────────────────────────────

export const getMeetings = (clientId: number) =>
  apiFetch<Meeting[]>(`/api/meetings?client_id=${clientId}`);

export const updateMeeting = (id: number, body: Partial<Meeting>) =>
  apiFetch<Meeting>(`/api/meetings/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });

// ── Briefs ────────────────────────────────────────────────────────────────────

export const generateBrief = (clientId: number, meetingId: number) =>
  apiFetch<Brief>("/api/briefs/generate", {
    method: "POST",
    body: JSON.stringify({ client_id: clientId, meeting_id: meetingId }),
  });

export const getBrief = (meetingId: number) =>
  apiFetch<Brief>(`/api/briefs/${meetingId}`);

// ── Transcripts ───────────────────────────────────────────────────────────────

export const uploadTranscript = (clientId: number, meetingId: number, rawText: string) =>
  apiFetch<Transcript>("/api/transcripts/upload", {
    method: "POST",
    body: JSON.stringify({ client_id: clientId, meeting_id: meetingId, raw_text: rawText }),
  });

export const analyzeTranscript = (transcriptId: number) =>
  apiFetch<PostCallAnalysis>(`/api/transcripts/${transcriptId}/analyze`, {
    method: "POST",
  });

export const getAnalysis = (transcriptId: number) =>
  apiFetch<PostCallAnalysis>(`/api/transcripts/${transcriptId}/analysis`);

export const draftEmail = (transcriptId: number) =>
  apiFetch<PostCallAnalysis>(`/api/transcripts/${transcriptId}/draft-email`, {
    method: "POST",
  });

export const saveEmailDraft = (transcriptId: number, subject: string, body: string) =>
  apiFetch<PostCallAnalysis>(`/api/transcripts/${transcriptId}/draft-email`, {
    method: "PATCH",
    body: JSON.stringify({ subject, body }),
  });

// ── Preferences ───────────────────────────────────────────────────────────────

export const getPreferences = (clientId: number) =>
  apiFetch<ClientPreference[]>(`/api/preferences/${clientId}`);

export const createPreference = (body: {
  client_id: number;
  category: string;
  preference: string;
  source?: string;
  meeting_id?: number;
}) => apiFetch<ClientPreference>("/api/preferences", { method: "POST", body: JSON.stringify(body) });

export const deletePreference = (id: number) =>
  fetch(`${API_BASE}/api/preferences/${id}`, { method: "DELETE" });

// ── Portfolio ─────────────────────────────────────────────────────────────────

export const getPortfolio = (clientId: number) =>
  apiFetch<PortfolioData>(`/api/portfolio/${clientId}`);

export const analyzePortfolio = (clientId: number) =>
  apiFetch<RebalancingAnalysis>(`/api/portfolio/${clientId}/analyze`, { method: "POST" });

// ── Helpers ───────────────────────────────────────────────────────────────────

export function parseJsonField<T>(field: string | null | undefined, fallback: T): T {
  if (!field) return fallback;
  try {
    return JSON.parse(field) as T;
  } catch {
    return fallback;
  }
}

export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function daysUntil(dateStr: string): number {
  const now = new Date();
  const target = new Date(dateStr);
  return Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}
