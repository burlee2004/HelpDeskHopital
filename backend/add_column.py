import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    conn.execute(text("ALTER TABLE feedbacks ADD COLUMN sentiment VARCHAR(50);"))
    conn.commit()
print("Added sentiment column successfully")
