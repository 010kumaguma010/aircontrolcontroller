import os
from sqlalchemy import create_engine, Column, Integer, Float, String, DateTime
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from datetime import datetime, timezone

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./aircon.db")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)


class Base(DeclarativeBase):
    pass


class ProfileRecord(Base):
    __tablename__ = "profile"

    id = Column(Integer, primary_key=True, default=1)
    room_name = Column(String, default="ワンルーム")
    tatami_size = Column(Float, default=14.0)
    insulation_level = Column(String, default="木造")
    aircon_cooling_kw = Column(Float, default=2.8)
    # occupant_load: 居住者1名+PC等を想定した固定値 (kW)
    occupant_load = Column(Float, default=0.3)
    updated_at = Column(DateTime)


def init_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        existing = db.query(ProfileRecord).filter_by(id=1).first()
        if not existing:
            db.add(ProfileRecord(id=1, updated_at=datetime.now(timezone.utc)))
            db.commit()
    finally:
        db.close()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
