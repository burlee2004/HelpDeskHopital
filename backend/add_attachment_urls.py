import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("DATABASE_URL not found!")
    exit(1)

engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE comments ADD COLUMN attachment_urls VARCHAR;"))
        conn.commit()
        print("Successfully added attachment_urls to comments!")
    except Exception as e:
        print("Error or already exists:", e)
