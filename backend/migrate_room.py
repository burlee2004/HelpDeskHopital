import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import models
from database import engine

load_dotenv()

with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE users ADD COLUMN room_number VARCHAR;"))
        conn.commit()
    except Exception as e:
        pass
