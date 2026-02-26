from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Date, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String)
    age = Column(Integer)
    occupation = Column(String)
    risk_profile = Column(String)
    accounts = Column(Text)  # JSON array string
    portfolio_value = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    preferences = relationship("ClientPreference", back_populates="client", cascade="all, delete-orphan")
    meetings = relationship("Meeting", back_populates="client", cascade="all, delete-orphan")


class ClientPreference(Base):
    __tablename__ = "client_preferences"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"))
    category = Column(String)  # life_goal | concern | interest | constraint
    preference = Column(Text)
    source = Column(String)    # transcript | manual
    meeting_id = Column(Integer, ForeignKey("meetings.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    client = relationship("Client", back_populates="preferences")


class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"))
    scheduled_at = Column(DateTime)
    meeting_type = Column(String)  # quarterly_review | onboarding | ad_hoc
    status = Column(String)        # upcoming | completed
    advisor_notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    client = relationship("Client", back_populates="meetings")
    brief = relationship("Brief", back_populates="meeting", uselist=False, cascade="all, delete-orphan")
    transcript = relationship("Transcript", back_populates="meeting", uselist=False, cascade="all, delete-orphan")


class Brief(Base):
    __tablename__ = "briefs"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"))
    meeting_id = Column(Integer, ForeignKey("meetings.id"), unique=True)
    generated_at = Column(DateTime, default=datetime.utcnow)
    summary = Column(Text)
    talking_points = Column(Text)   # JSON array
    flags = Column(Text)            # JSON array
    action_items = Column(Text)     # JSON array
    portfolio_flags = Column(Text)  # JSON array — cross-referenced with portfolio drift
    market_context = Column(Text)
    raw_prompt_used = Column(Text)

    meeting = relationship("Meeting", back_populates="brief")


class Transcript(Base):
    __tablename__ = "transcripts"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"))
    meeting_id = Column(Integer, ForeignKey("meetings.id"), unique=True)
    raw_text = Column(Text)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    processed = Column(Boolean, default=False)

    meeting = relationship("Meeting", back_populates="transcript")
    analysis = relationship("PostCallAnalysis", back_populates="transcript", uselist=False, cascade="all, delete-orphan")


class PostCallAnalysis(Base):
    __tablename__ = "post_call_analyses"

    id = Column(Integer, primary_key=True, index=True)
    transcript_id = Column(Integer, ForeignKey("transcripts.id"))
    client_id = Column(Integer, ForeignKey("clients.id"))
    meeting_id = Column(Integer, ForeignKey("meetings.id"))
    summary = Column(Text)
    decisions_made = Column(Text)        # JSON array
    action_items = Column(Text)          # JSON array of {item, owner, due}
    extracted_preferences = Column(Text) # JSON array of {category, preference}
    flags = Column(Text)                 # JSON array
    generated_at = Column(DateTime, default=datetime.utcnow)
    draft_email = Column(Text, nullable=True)  # JSON: {"subject": "...", "body": "..."}

    transcript = relationship("Transcript", back_populates="analysis")


class PortfolioHolding(Base):
    __tablename__ = "portfolio_holdings"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"))
    account_type = Column(String)   # RRSP | TFSA | FHSA | Non-Reg | RRIF | Corporate
    asset_class = Column(String)    # canadian_equity | us_equity | intl_equity | canadian_bond | cash | real_estate | alternative
    ticker = Column(String)
    name = Column(String)
    units = Column(Float)
    current_price = Column(Float)
    current_value = Column(Float)   # units * current_price
    as_of_date = Column(Date)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class TargetAllocation(Base):
    __tablename__ = "target_allocations"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"))
    account_type = Column(String, nullable=True)  # NULL = overall portfolio target
    asset_class = Column(String)
    target_pct = Column(Float)           # e.g. 0.40 = 40%
    drift_threshold = Column(Float, default=0.05)
    created_at = Column(DateTime, default=datetime.utcnow)


class RebalancingAnalysis(Base):
    __tablename__ = "rebalancing_analyses"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"))
    generated_at = Column(DateTime, default=datetime.utcnow)
    portfolio_summary = Column(Text)   # JSON: engine output (total value, drift score, allocation_summary)
    drift_flags = Column(Text)         # JSON array of human-readable flagged items from engine
    ai_narrative = Column(Text)        # Plain text narrative from GPT-4o
    context_flags = Column(Text)       # JSON array: [{flag, context, urgency, suggested_question}]
    overall_urgency = Column(String)   # low | medium | high
    no_action_needed = Column(Boolean, default=False)
    last_rebalanced = Column(Date, nullable=True)
