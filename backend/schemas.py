from pydantic import BaseModel
from typing import List, Optional, Any
from datetime import datetime


# ── Client ──────────────────────────────────────────────────────────────────

class ClientBase(BaseModel):
    name: str
    email: Optional[str] = None
    age: Optional[int] = None
    occupation: Optional[str] = None
    risk_profile: Optional[str] = None
    accounts: Optional[str] = None  # JSON string e.g. '["RRSP","TFSA"]'
    portfolio_value: Optional[float] = None


class ClientCreate(ClientBase):
    pass


class ClientUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    age: Optional[int] = None
    occupation: Optional[str] = None
    risk_profile: Optional[str] = None
    accounts: Optional[str] = None
    portfolio_value: Optional[float] = None


class ClientPreferenceOut(BaseModel):
    id: int
    client_id: int
    category: str
    preference: str
    source: str
    meeting_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class MeetingOut(BaseModel):
    id: int
    client_id: int
    scheduled_at: datetime
    meeting_type: str
    status: str
    advisor_notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ClientOut(BaseModel):
    id: int
    name: str
    email: Optional[str] = None
    age: Optional[int] = None
    occupation: Optional[str] = None
    risk_profile: Optional[str] = None
    accounts: Optional[str] = None
    portfolio_value: Optional[float] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ClientListItem(ClientOut):
    next_meeting: Optional[MeetingOut] = None
    last_meeting: Optional[MeetingOut] = None
    drift_score: Optional[int] = None
    drift_analyzed_at: Optional[str] = None


class ClientDetail(ClientOut):
    preferences: List[ClientPreferenceOut] = []
    meetings: List[MeetingOut] = []


# ── Meetings ─────────────────────────────────────────────────────────────────

class MeetingCreate(BaseModel):
    client_id: int
    scheduled_at: datetime
    meeting_type: str
    status: str = "upcoming"
    advisor_notes: Optional[str] = None


class MeetingUpdate(BaseModel):
    status: Optional[str] = None
    advisor_notes: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    meeting_type: Optional[str] = None


# ── Briefs ───────────────────────────────────────────────────────────────────

class BriefGenerateRequest(BaseModel):
    client_id: int
    meeting_id: int


class BriefOut(BaseModel):
    id: int
    client_id: int
    meeting_id: int
    generated_at: datetime
    summary: Optional[str] = None
    talking_points: Optional[str] = None  # JSON string
    flags: Optional[str] = None
    action_items: Optional[str] = None
    portfolio_flags: Optional[str] = None  # JSON string
    market_context: Optional[str] = None

    class Config:
        from_attributes = True


# ── Transcripts ───────────────────────────────────────────────────────────────

class TranscriptUploadRequest(BaseModel):
    client_id: int
    meeting_id: int
    raw_text: str


class TranscriptOut(BaseModel):
    id: int
    client_id: int
    meeting_id: int
    raw_text: str
    uploaded_at: datetime
    processed: bool

    class Config:
        from_attributes = True


class PostCallAnalysisOut(BaseModel):
    id: int
    transcript_id: int
    client_id: int
    meeting_id: int
    summary: Optional[str] = None
    decisions_made: Optional[str] = None
    action_items: Optional[str] = None
    extracted_preferences: Optional[str] = None
    flags: Optional[str] = None
    draft_email: Optional[str] = None  # JSON: {"subject": "...", "body": "..."}
    generated_at: datetime

    class Config:
        from_attributes = True


class EmailDraftSaveRequest(BaseModel):
    subject: str
    body: str


# ── Preferences ───────────────────────────────────────────────────────────────

class PreferenceCreate(BaseModel):
    client_id: int
    category: str
    preference: str
    source: str = "manual"
    meeting_id: Optional[int] = None
