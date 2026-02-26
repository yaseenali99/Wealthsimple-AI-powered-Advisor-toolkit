from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import ClientPreference
from schemas import PreferenceCreate, ClientPreferenceOut

router = APIRouter()


@router.get("/{client_id}", response_model=List[ClientPreferenceOut])
def get_preferences(client_id: int, db: Session = Depends(get_db)):
    return (
        db.query(ClientPreference)
        .filter(ClientPreference.client_id == client_id)
        .order_by(ClientPreference.created_at.desc())
        .all()
    )


@router.post("", response_model=ClientPreferenceOut, status_code=201)
def create_preference(body: PreferenceCreate, db: Session = Depends(get_db)):
    pref = ClientPreference(**body.model_dump())
    db.add(pref)
    db.commit()
    db.refresh(pref)
    return pref


@router.delete("/{preference_id}", status_code=204)
def delete_preference(preference_id: int, db: Session = Depends(get_db)):
    pref = db.query(ClientPreference).filter(ClientPreference.id == preference_id).first()
    if not pref:
        raise HTTPException(status_code=404, detail="Preference not found")
    db.delete(pref)
    db.commit()
