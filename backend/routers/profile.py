from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from models import ProfileResponse, ProfileUpdate
from database import get_db, ProfileRecord

router = APIRouter()


def _to_response(record: ProfileRecord) -> ProfileResponse:
    return ProfileResponse(
        room_name=record.room_name,
        tatami_size=record.tatami_size,
        insulation_level=record.insulation_level,
        aircon_cooling_kw=record.aircon_cooling_kw,
        occupant_load=record.occupant_load,
        updated_at=record.updated_at.isoformat() if record.updated_at else None,
    )


@router.get("/profile", response_model=ProfileResponse)
def get_profile(db: Session = Depends(get_db)):
    record = db.query(ProfileRecord).filter_by(id=1).first()
    return _to_response(record)


@router.post("/profile", response_model=ProfileResponse)
def update_profile(body: ProfileUpdate, db: Session = Depends(get_db)):
    record = db.query(ProfileRecord).filter_by(id=1).first()
    record.room_name = body.room_name
    record.tatami_size = body.tatami_size
    record.insulation_level = body.insulation_level
    record.aircon_cooling_kw = body.aircon_cooling_kw
    record.occupant_load = body.occupant_load
    record.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(record)
    return _to_response(record)
