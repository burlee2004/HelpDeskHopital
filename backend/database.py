import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv() # Đọc file .env

# --- CÁCH 1: DÙNG SQLITE (ĐÃ COMMENT LẠI ĐỂ BACKUP THEO YÊU CẦU) ---
# SQLALCHEMY_DATABASE_URL = "sqlite:///./helpdesk.db"
# engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})

# --- CÁCH 2: DÙNG POSTGRESQL TRÊN NEON (ONLINE - MỚI NHẤT) ---
# Ưu tiên đọc biến môi trường DATABASE_URL nếu có, nếu không thì dùng chuỗi Neon cứng để lên mạng không bị lỗi
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL") or "postgresql://neondb_owner:npg_j0Qs5yYnkgth@ep-steep-feather-axq1k7y5-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Engine cho PostgreSQL không cần check_same_thread
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependency để lấy DB session cho mỗi request
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()