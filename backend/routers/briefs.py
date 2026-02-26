from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Brief, Client, Meeting
from schemas import BriefGenerateRequest, BriefOut
from services.brief_builder import build_brief_context
from services.openai_service import generate_brief
import json
from datetime import datetime

router = APIRouter()


@router.post("/generate", response_model=BriefOut)
def generate_brief_endpoint(body: BriefGenerateRequest, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == body.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    meeting = db.query(Meeting).filter(Meeting.id == body.meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    context, user_prompt = build_brief_context(client, meeting, db)
    brief_data = generate_brief(user_prompt)

    existing = db.query(Brief).filter(Brief.meeting_id == body.meeting_id).first()
    if existing:
        existing.summary = brief_data.get("client_snapshot", "")
        existing.talking_points = json.dumps(brief_data.get("talking_points", []))
        existing.flags = json.dumps(brief_data.get("flags", []))
        existing.action_items = json.dumps(brief_data.get("open_action_items", []))
        existing.portfolio_flags = json.dumps(brief_data.get("portfolio_flags", []))
        existing.market_context = brief_data.get("market_context", "")
        existing.raw_prompt_used = user_prompt
        existing.generated_at = datetime.utcnow()
        db.commit()
        db.refresh(existing)
        return existing

    brief = Brief(
        client_id=body.client_id,
        meeting_id=body.meeting_id,
        summary=brief_data.get("client_snapshot", ""),
        talking_points=json.dumps(brief_data.get("talking_points", [])),
        flags=json.dumps(brief_data.get("flags", [])),
        action_items=json.dumps(brief_data.get("open_action_items", [])),
        portfolio_flags=json.dumps(brief_data.get("portfolio_flags", [])),
        market_context=brief_data.get("market_context", ""),
        raw_prompt_used=user_prompt,
    )
    db.add(brief)
    db.commit()
    db.refresh(brief)
    return brief


@router.get("/{meeting_id}", response_model=BriefOut)
def get_brief(meeting_id: int, db: Session = Depends(get_db)):
    brief = db.query(Brief).filter(Brief.meeting_id == meeting_id).first()
    if not brief:
        raise HTTPException(status_code=404, detail="Brief not found for this meeting")
    return brief
