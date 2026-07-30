import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import models
from database import engine

load_dotenv()

models.Base.metadata.create_all(bind=engine)

with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE tickets ADD COLUMN severity VARCHAR DEFAULT 'Bình thường';"))
        conn.commit()
    except Exception as e:
        pass
        
    try:
        conn.execute(text("ALTER TABLE tickets ADD COLUMN admin_notes VARCHAR;"))
        conn.commit()
    except Exception as e:
        pass
