from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Any, Dict
from datetime import datetime
import json

from database import get_db
from models import Client, Meeting, RebalancingAnalysis
from schemas import ClientCreate, ClientUpdate, ClientOut, ClientListItem, ClientDetail, MeetingOut

router = APIRouter()


@router.get("", response_model=List[ClientListItem])
def list_clients(db: Session = Depends(get_db)):
    clients = db.query(Client).order_by(Client.name).all()
    result = []
    for client in clients:
        now = datetime.utcnow()
        upcoming = (
            db.query(Meeting)
            .filter(Meeting.client_id == client.id, Meeting.status == "upcoming")
            .order_by(Meeting.scheduled_at.asc())
            .first()
        )
        last = (
            db.query(Meeting)
            .filter(Meeting.client_id == client.id, Meeting.status == "completed")
            .order_by(Meeting.scheduled_at.desc())
            .first()
        )
        latest_analysis = (
            db.query(RebalancingAnalysis)
            .filter(RebalancingAnalysis.client_id == client.id)
            .order_by(RebalancingAnalysis.generated_at.desc())
            .first()
        )
        drift_score = None
        drift_analyzed_at = None
        if latest_analysis and latest_analysis.portfolio_summary:
            try:
                summary = json.loads(latest_analysis.portfolio_summary)
                drift_score = summary.get("drift_score")
                drift_analyzed_at = latest_analysis.generated_at.isoformat()
            except (json.JSONDecodeError, TypeError):
                pass

        item = ClientListItem.model_validate(client)
        item.next_meeting = MeetingOut.model_validate(upcoming) if upcoming else None
        item.last_meeting = MeetingOut.model_validate(last) if last else None
        item.drift_score = drift_score
        item.drift_analyzed_at = drift_analyzed_at
        result.append(item)
    return result


@router.get("/{client_id}", response_model=ClientDetail)
def get_client(client_id: int, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client


@router.post("", response_model=ClientOut, status_code=201)
def create_client(body: ClientCreate, db: Session = Depends(get_db)):
    client = Client(**body.model_dump())
    db.add(client)
    db.commit()
    db.refresh(client)
    return client


@router.put("/{client_id}", response_model=ClientOut)
def update_client(client_id: int, body: ClientUpdate, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(client, field, value)
    client.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(client)
    return client
