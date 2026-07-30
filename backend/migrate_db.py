import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import models
from database import engine

load_dotenv()

# Tạo bảng mới (departments)
models.Base.metadata.create_all(bind=engine)

# Thêm cột department_id vào users
with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE users ADD COLUMN department_id INTEGER REFERENCES departments(id);"))
        conn.commit()
        print("Đã thêm cột department_id thành công")
    except Exception as e:
        print("Lỗi (có thể cột đã tồn tại):", e)

print("Migration hoàn tất!")
