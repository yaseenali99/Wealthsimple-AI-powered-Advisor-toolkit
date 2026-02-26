from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models import Client, Meeting, Transcript, PostCallAnalysis, ClientPreference, Brief

router = APIRouter()


def _reset_daniel_demo_meeting(db: Session) -> dict:
    """
    Resets Daniel's most recent meeting to a clean pre-demo state:
    - Deletes any uploaded transcript and its post-call analysis
    - Removes any transcript-sourced preferences for that meeting
    - Deletes any generated brief so it can be freshly generated during the demo
    - Resets meeting status back to 'upcoming'
    """
    daniel = db.query(Client).filter(Client.name == "Daniel Osei").first()
    if not daniel:
        return {"reset": False, "reason": "Daniel Osei not found"}

    # The demo meeting is always Daniel's latest scheduled meeting
    meeting = (
        db.query(Meeting)
        .filter(Meeting.client_id == daniel.id)
        .order_by(Meeting.scheduled_at.desc())
        .first()
    )
    if not meeting:
        return {"reset": False, "reason": "No meeting found for Daniel"}

    transcript = db.query(Transcript).filter(Transcript.meeting_id == meeting.id).first()
    if transcript:
        db.query(PostCallAnalysis).filter(
            PostCallAnalysis.transcript_id == transcript.id
        ).delete()
        db.delete(transcript)

    db.query(ClientPreference).filter(
        ClientPreference.client_id == daniel.id,
        ClientPreference.meeting_id == meeting.id,
        ClientPreference.source == "transcript",
    ).delete()

    db.query(Brief).filter(Brief.meeting_id == meeting.id).delete()

    meeting.status = "upcoming"
    db.commit()

    return {
        "reset": True,
        "client": "Daniel Osei",
        "meeting_id": meeting.id,
        "meeting_date": str(meeting.scheduled_at.date()),
    }


@router.post("/reset")
def reset_demo(db: Session = Depends(get_db)):
    return _reset_daniel_demo_meeting(db)
