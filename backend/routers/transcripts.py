from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import json
from datetime import datetime

from database import get_db
from models import Client, Meeting, Transcript, PostCallAnalysis, ClientPreference
from schemas import TranscriptUploadRequest, TranscriptOut, PostCallAnalysisOut, EmailDraftSaveRequest
from services.openai_service import analyze_transcript, generate_draft_email

router = APIRouter()


@router.post("/upload", response_model=TranscriptOut, status_code=201)
def upload_transcript(body: TranscriptUploadRequest, db: Session = Depends(get_db)):
    client = db.query(Client).filter(Client.id == body.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    meeting = db.query(Meeting).filter(Meeting.id == body.meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    existing = db.query(Transcript).filter(Transcript.meeting_id == body.meeting_id).first()
    if existing:
        existing.raw_text = body.raw_text
        existing.processed = False
        existing.uploaded_at = datetime.utcnow()
        db.commit()
        db.refresh(existing)
        return existing

    transcript = Transcript(
        client_id=body.client_id,
        meeting_id=body.meeting_id,
        raw_text=body.raw_text,
    )
    db.add(transcript)
    db.commit()
    db.refresh(transcript)
    return transcript


@router.post("/{transcript_id}/analyze", response_model=PostCallAnalysisOut)
def analyze_transcript_endpoint(transcript_id: int, db: Session = Depends(get_db)):
    transcript = db.query(Transcript).filter(Transcript.id == transcript_id).first()
    if not transcript:
        raise HTTPException(status_code=404, detail="Transcript not found")

    client = db.query(Client).filter(Client.id == transcript.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    result = analyze_transcript(client, transcript)

    existing = db.query(PostCallAnalysis).filter(
        PostCallAnalysis.transcript_id == transcript_id
    ).first()

    if existing:
        existing.summary = result.get("summary", "")
        existing.decisions_made = json.dumps(result.get("decisions_made", []))
        existing.action_items = json.dumps(result.get("action_items", []))
        existing.extracted_preferences = json.dumps(result.get("extracted_preferences", []))
        existing.flags = json.dumps(result.get("flags", []))
        existing.generated_at = datetime.utcnow()
        db.commit()
        db.refresh(existing)
        analysis = existing
    else:
        analysis = PostCallAnalysis(
            transcript_id=transcript_id,
            client_id=transcript.client_id,
            meeting_id=transcript.meeting_id,
            summary=result.get("summary", ""),
            decisions_made=json.dumps(result.get("decisions_made", [])),
            action_items=json.dumps(result.get("action_items", [])),
            extracted_preferences=json.dumps(result.get("extracted_preferences", [])),
            flags=json.dumps(result.get("flags", [])),
        )
        db.add(analysis)
        db.commit()
        db.refresh(analysis)

    # Replace extracted preferences for this meeting (avoid duplicates on re-analysis)
    db.query(ClientPreference).filter(
        ClientPreference.client_id == transcript.client_id,
        ClientPreference.meeting_id == transcript.meeting_id,
        ClientPreference.source == "transcript",
    ).delete()

    extracted = result.get("extracted_preferences", [])
    for ep in extracted:
        pref = ClientPreference(
            client_id=transcript.client_id,
            category=ep.get("category", "interest"),
            preference=ep.get("preference", ""),
            source="transcript",
            meeting_id=transcript.meeting_id,
        )
        db.add(pref)

    # Mark transcript processed and flip meeting to completed
    transcript.processed = True
    meeting = db.query(Meeting).filter(Meeting.id == transcript.meeting_id).first()
    if meeting and meeting.status == "upcoming":
        meeting.status = "completed"

    db.commit()

    return analysis


@router.get("/{transcript_id}/analysis", response_model=PostCallAnalysisOut)
def get_analysis(transcript_id: int, db: Session = Depends(get_db)):
    analysis = db.query(PostCallAnalysis).filter(
        PostCallAnalysis.transcript_id == transcript_id
    ).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return analysis


@router.post("/{transcript_id}/draft-email", response_model=PostCallAnalysisOut)
def draft_email_endpoint(transcript_id: int, db: Session = Depends(get_db)):
    transcript = db.query(Transcript).filter(Transcript.id == transcript_id).first()
    if not transcript:
        raise HTTPException(status_code=404, detail="Transcript not found")

    analysis = db.query(PostCallAnalysis).filter(
        PostCallAnalysis.transcript_id == transcript_id
    ).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found — run analysis first")

    client = db.query(Client).filter(Client.id == transcript.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    result = generate_draft_email(client, analysis)
    analysis.draft_email = json.dumps(result)
    db.commit()
    db.refresh(analysis)
    return analysis


@router.patch("/{transcript_id}/draft-email", response_model=PostCallAnalysisOut)
def save_email_draft(transcript_id: int, body: EmailDraftSaveRequest, db: Session = Depends(get_db)):
    analysis = db.query(PostCallAnalysis).filter(
        PostCallAnalysis.transcript_id == transcript_id
    ).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    analysis.draft_email = json.dumps({"subject": body.subject, "body": body.body})
    db.commit()
    db.refresh(analysis)
    return analysis
