import os
from sqlalchemy import create_engine
from database import Base
import models # ensure models are loaded
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("DATABASE_URL not found!")
    exit(1)

engine = create_engine(DATABASE_URL)

try:
    Base.metadata.create_all(bind=engine)
    print("Successfully created internal_messages table!")
except Exception as e:
    print("Error:", e)
