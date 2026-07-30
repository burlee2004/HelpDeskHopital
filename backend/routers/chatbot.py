# File: routers/chatbot.py
import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from dotenv import load_dotenv

# THAY ĐỔI: Sử dụng thư viện google-genai mới (hết hoàn toàn cảnh báo)
from google import genai

# Import database và schema từ project của bạn
from database import get_db
import models, schemas
from dependencies import get_current_user 

router = APIRouter(
    prefix="/chatbot",
    tags=["Chatbot AI"]
)

load_dotenv() # Đọc file .env
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# THAY ĐỔI: Khởi tạo client theo chuẩn mới
client = genai.Client(api_key=GEMINI_API_KEY)

# Bơm System Prompt (Định hình nhân vật cho AI)
SYSTEM_PROMPT = """
Bạn là một trợ lý IT Helpdesk chuyên nghiệp tại bệnh viện. 
Nhiệm vụ của bạn là hướng dẫn nhân viên y tế khắc phục các lỗi máy tính, mạng, hoặc phần mềm cơ bản.
Hãy trả lời ngắn gọn, lịch sự, từng bước rõ ràng bằng tiếng Việt. 
Nếu lỗi quá phức tạp (như hỏng phần cứng, mất kết nối server), hãy khuyên họ tạo Ticket để IT xuống kiểm tra.
"""

@router.post("/ask", response_model=schemas.ChatResponse)
def ask_chatbot(request: schemas.ChatRequest, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    try:
        prompt = f"{SYSTEM_PROMPT}\nCâu hỏi của người dùng: {request.question}"
        
        # THAY ĐỔI: Cú pháp gọi AI mới gọn gàng hơn
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
        )
        ai_answer = response.text

        # Lưu vào Database
        new_chat = models.ChatHistory(
            user_id=current_user.id,
            question=request.question,
            answer=ai_answer
        )
        db.add(new_chat)
        db.commit()
        db.refresh(new_chat)

        return new_chat

    except Exception as e:
        # ---> THÊM DÒNG PRINT NÀY ĐỂ IN LỖI RA MÀN HÌNH TERMINAL
        print(f"=== CHI TIẾT LỖI CHATBOT: {str(e)} ===") 
        raise HTTPException(status_code=500, detail=f"Lỗi kết nối AI: {str(e)}")
    
@router.get("/history", response_model=list[schemas.ChatResponse])
def get_chat_history(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.ChatHistory).filter(models.ChatHistory.user_id == current_user.id).order_by(models.ChatHistory.id.desc()).all()