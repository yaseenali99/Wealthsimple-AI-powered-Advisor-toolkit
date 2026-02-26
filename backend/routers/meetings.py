from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from database import get_db
from models import Meeting
from schemas import MeetingCreate, MeetingUpdate, MeetingOut

router = APIRouter()


@router.get("", response_model=List[MeetingOut])
def list_meetings(
    client_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(Meeting)
    if client_id:
        q = q.filter(Meeting.client_id == client_id)
    return q.order_by(Meeting.scheduled_at.desc()).all()


@router.post("", response_model=MeetingOut, status_code=201)
def create_meeting(body: MeetingCreate, db: Session = Depends(get_db)):
    meeting = Meeting(**body.model_dump())
    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    return meeting


@router.put("/{meeting_id}", response_model=MeetingOut)
def update_meeting(meeting_id: int, body: MeetingUpdate, db: Session = Depends(get_db)):
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(meeting, field, value)
    db.commit()
    db.refresh(meeting)
    return meeting
