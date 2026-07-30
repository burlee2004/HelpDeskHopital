import os
import shutil
from typing import List
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import or_
from jose import jwt, JWTError
from fastapi.middleware.cors import CORSMiddleware 
from fastapi.staticfiles import StaticFiles # Import thư viện file tĩnh
# Thêm vào phần đầu file main.py
from routers import chatbot
# ---> THÊM DÒNG NÀY ĐỂ LẤY DEPENDENCIES VÀO MAIN
from dependencies import get_current_user, require_admin
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks
from email_service import send_notification_email
import models
import schemas
import auth
from database import engine, get_db
from google import genai
import os

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


from fastapi.staticfiles import StaticFiles
from routers import chatbot

# THÊM DÒNG NÀY ĐỂ GỌI BOT VÀO MAIN
from auto_assign import auto_assign_ticket


# 1. Tự động tạo bảng Database
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Helpdesk System API")

# Thêm vào dưới chỗ app = FastAPI(...)
app.include_router(chatbot.router)

# Tạo thư mục uploads nếu chưa có
os.makedirs("uploads", exist_ok=True)
# Cho phép Frontend truy cập vào thư mục uploads
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# BƯỚC THÊM VÀO: Cấu hình CORS để cho phép Next.js gọi API
# Thêm đoạn này để cho phép Vercel kết nối
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://help-desk-hopital-132.vercel.app", # Link frontend Vercel của bạn
        "http://localhost:3000" # Giữ lại localhost để bạn code trên máy tính
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Setup Bearer Token cho Swagger UI
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# ==========================================
# 2. SEED DATA: TỰ ĐỘNG TẠO TÀI KHOẢN ADMIN
# ==========================================
@app.on_event("startup")
def seed_admin():
    db = next(get_db())
    admin_email = "admin@helpdesk.com"
    # Kiểm tra xem Admin đã tồn tại chưa
    admin = db.query(models.User).filter(models.User.email == admin_email).first()
    if not admin:
        hashed_pw = auth.get_password_hash("Admin123") # Mật khẩu khởi tạo
        new_admin = models.User(
            full_name="System Admin",
            email=admin_email,
            hashed_password=hashed_pw,
            role=models.UserRole.IT_MANAGER
        )
        db.add(new_admin)
        db.commit()
        print("Đã tạo tài khoản Admin mặc định: admin@helpdesk.com / Admin123")

# ==========================================
# 3. API ĐĂNG NHẬP (LOGIN)
# ==========================================
@app.post("/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sai email hoặc mật khẩu",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # ---> THÊM ĐOẠN NÀY: Bật trạng thái Online khi đăng nhập đúng
    user.is_online = True
    db.commit()
    
    # Tạo Token chứa email và quyền của user
    access_token = auth.create_access_token(data={"sub": user.email, "role": user.role})
    return {"access_token": access_token, "token_type": "bearer", "role": user.role}

# ==========================================
# 4. HÀM KIỂM TRA QUYỀN (MIDDLEWARE)
# ==========================================
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Token không hợp lệ")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token không hợp lệ")
    
    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        raise HTTPException(status_code=401, detail="Không tìm thấy User")
    return user

# Hàm chặn: Chỉ Admin mới được đi qua
def require_admin(current_user: models.User = Depends(get_current_user)):
    if current_user.role != models.UserRole.IT_MANAGER:
        raise HTTPException(status_code=403, detail="Bạn không có quyền truy cập chức năng này")
    return current_user

# ==========================================
# 5. API QUẢN LÝ TÀI KHOẢN (CHỈ ADMIN)
# ==========================================
@app.post("/users/", response_model=schemas.UserResponse)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db), current_admin: models.User = Depends(require_admin)):
    # Kiểm tra xem email đã tồn tại chưa
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email này đã được đăng ký")
    
    # Băm mật khẩu và lưu user mới
    hashed_password = auth.get_password_hash(user.password)
    new_user = models.User(
        full_name=user.full_name,
        email=user.email,
        hashed_password=hashed_password,
        role=user.role,
        department_id=user.department_id if user.role == models.UserRole.END_USER else None,
        room_number=user.room_number if user.role == models.UserRole.END_USER else None
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user
# ==========================================
# 6. API LẤY DANH SÁCH TÀI KHOẢN
# ==========================================
@app.get("/users/", response_model=list[schemas.UserResponse])
def get_users(db: Session = Depends(get_db), current_admin: models.User = Depends(require_admin)):
    # Lấy tất cả user NHƯNG loại trừ Admin gốc (admin@helpdesk.com)
    users = db.query(models.User).filter(models.User.email != "admin@helpdesk.com").all()
    return users

# ==========================================
# 7. API XÓA TÀI KHOẢN
# ==========================================
@app.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), current_admin: models.User = Depends(require_admin)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản")
    db.delete(user)
    db.commit()
    return {"message": "Xóa thành công"}

# ==========================================
# 8. API SỬA TÀI KHOẢN
# ==========================================
@app.put("/users/{user_id}", response_model=schemas.UserResponse)
def update_user(user_id: int, user_update: schemas.UserCreate, db: Session = Depends(get_db), current_admin: models.User = Depends(require_admin)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản")
    db_user.full_name = user_update.full_name
    db_user.email = user_update.email
    db_user.role = user_update.role
    db_user.department_id = user_update.department_id if user_update.role == models.UserRole.END_USER else None
    db_user.room_number = user_update.room_number if user_update.role == models.UserRole.END_USER else None
    
    # Nếu admin gõ mật khẩu mới thì mới băm và cập nhật
    if user_update.password:
        db_user.hashed_password = auth.get_password_hash(user_update.password)
        
    db.commit()
    db.refresh(db_user)
    return db_user
# ==========================================
# 9. API LẤY THÔNG TIN PROFILE CÁ NHÂN
# ==========================================
@app.get("/users/me", response_model=schemas.UserResponse)
def read_users_me(current_user: models.User = Depends(get_current_user)):
    # get_current_user đã làm nhiệm vụ kiểm tra token và tìm user trong DB rồi
    # Nên ở đây chỉ việc trả data về cho Frontend
    return current_user

# ==========================================
# QUẢN LÝ PHÒNG BAN (DEPARTMENTS) - CHỈ ADMIN
# ==========================================
@app.get("/departments/", response_model=List[schemas.DepartmentResponse])
def get_departments(db: Session = Depends(get_db)):
    return db.query(models.Department).all()

@app.post("/departments/", response_model=schemas.DepartmentResponse)
def create_department(dept: schemas.DepartmentCreate, db: Session = Depends(get_db), current_admin: models.User = Depends(require_admin)):
    new_dept = models.Department(name=dept.name, description=dept.description)
    db.add(new_dept)
    db.commit()
    db.refresh(new_dept)
    return new_dept

@app.put("/departments/{dept_id}", response_model=schemas.DepartmentResponse)
def update_department(dept_id: int, dept: schemas.DepartmentCreate, db: Session = Depends(get_db), current_admin: models.User = Depends(require_admin)):
    db_dept = db.query(models.Department).filter(models.Department.id == dept_id).first()
    if not db_dept:
        raise HTTPException(status_code=404, detail="Không tìm thấy phòng ban")
    db_dept.name = dept.name
    db_dept.description = dept.description
    db.commit()
    db.refresh(db_dept)
    return db_dept

@app.delete("/departments/{dept_id}")
def delete_department(dept_id: int, db: Session = Depends(get_db), current_admin: models.User = Depends(require_admin)):
    db_dept = db.query(models.Department).filter(models.Department.id == dept_id).first()
    if not db_dept:
        raise HTTPException(status_code=404, detail="Không tìm thấy phòng ban")
    
    # Kiểm tra xem có user nào đang thuộc phòng ban này không
    users_in_dept = db.query(models.User).filter(models.User.department_id == dept_id).first()
    if users_in_dept:
        raise HTTPException(status_code=400, detail="Không thể xóa phòng ban đang có nhân viên")
        
    db.delete(db_dept)
    db.commit()
    return {"message": "Xóa phòng ban thành công"}

# ==========================================
# 9.1 API LẤY DANH SÁCH IT (Cho chức năng Chuyển tiếp)
# ==========================================
@app.get("/users/it", response_model=List[schemas.UserResponse])
def get_it_users(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role not in [models.UserRole.IT_SUPPORTER, models.UserRole.IT_MANAGER]:
        raise HTTPException(status_code=403, detail="Chỉ IT mới có quyền xem danh sách IT")
    return db.query(models.User).filter(models.User.role.in_([models.UserRole.IT_SUPPORTER, models.UserRole.IT_MANAGER])).all()
# ==========================================
# 10. API TẠO TICKET KÈM HÌNH ẢNH (User gọi)
# ==========================================
@app.post("/tickets/", response_model=schemas.TicketResponse)
def create_ticket(
    background_tasks: BackgroundTasks,
    title: str = Form(...),
    description: str = Form(...),
    category: str = Form(...),
    priority: str = Form(...),
    files: List[UploadFile] = File(default=[]), # Nhận tối đa 4 file
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    image_paths = []
    # Lưu từng file vào thư mục uploads
    for file in files:
        if file.filename:
            file_location = f"uploads/{current_user.id}_{file.filename}"
            with open(file_location, "wb+") as file_object:
                shutil.copyfileobj(file.file, file_object)
            image_paths.append(f"/{file_location}")
    
    # Ghép các đường dẫn thành 1 chuỗi cách nhau bằng dấu phẩy
    images_str = ",".join(image_paths) if image_paths else None

    new_ticket = models.Ticket(
        title=title,
        description=description,
        category=category,
        priority=priority,
        image_urls=images_str,
        created_by=current_user.id
    )
    db.add(new_ticket)
    db.commit()
    db.refresh(new_ticket)
    # >>> THÊM ĐOẠN NÀY: Kích hoạt bot tự động chia việc ngay sau khi tạo thành công
    try:
        auto_assign_ticket(new_ticket.id, db)
        db.refresh(new_ticket) # Làm mới dữ liệu để trả về kết quả đã được gán việc
    except Exception as e:
        print(f"Lỗi phân phối tự động: {e}")
    # <<< KẾT THÚC ĐOẠN THÊM
    

    # 1. Ghi lịch sử
    history = models.TicketHistory(
        ticket_id=new_ticket.id, 
        action="Tạo mới", 
        description="Yêu cầu đã được hệ thống tiếp nhận."
    )
    db.add(history)
    db.commit()

    # 2. Gửi Email thông báo ngầm
    email_html = f"""
    <h3>Xin chào {current_user.full_name},</h3>
    <p>Yêu cầu hỗ trợ <b>#{new_ticket.id}: {new_ticket.title}</b> của bạn đã được ghi nhận.</p>
    <p>IT sẽ sớm liên hệ và xử lý. Bạn có thể theo dõi tiến độ trên hệ thống.</p>
    """
    background_tasks.add_task(send_notification_email, current_user.email, f"Đã tiếp nhận yêu cầu #{new_ticket.id}", email_html)
    return new_ticket

# ==========================================
# 11. API LẤY DANH SÁCH TICKET (Đã cập nhật bộ lọc)
# ==========================================
@app.get("/tickets/", response_model=list[schemas.TicketResponse])
def get_tickets(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # 1. Nếu là Admin -> Thấy tất cả ticket
    if current_user.role == models.UserRole.IT_MANAGER:
        return db.query(models.Ticket).order_by(models.Ticket.id.desc()).all()
    
    # 2. Nếu là IT -> CHỈ THẤY TICKET ĐƯỢC GIAO CHO MÌNH HOẶC CÓ TASK ĐƯỢC GIAO
    elif current_user.role == models.UserRole.IT_SUPPORTER:
        from sqlalchemy import or_
        return db.query(models.Ticket).outerjoin(models.TicketTask).filter(
            or_(
                models.Ticket.assigned_to == current_user.id,
                models.TicketTask.assignee_id == current_user.id
            )
        ).order_by(models.Ticket.id.desc()).all()
    
    # 3. Nếu là User -> Chỉ thấy ticket của mình tạo
    return db.query(models.Ticket).filter(models.Ticket.created_by == current_user.id).order_by(models.Ticket.id.desc()).all()

# ==========================================
# 12. API LẤY DANH SÁCH IT ĐANG ONLINE (Admin gọi)
# ==========================================
@app.get("/users/it-online", response_model=list[schemas.UserResponse])
def get_online_it(db: Session = Depends(get_db), current_admin: models.User = Depends(require_admin)):
    return db.query(models.User).filter(
        models.User.role == models.UserRole.IT_SUPPORTER,
        models.User.is_online == True
    ).all()

# ==========================================
# 13. API PHÂN CÔNG TICKET CHO IT (Admin gọi)
# ==========================================
@app.put("/tickets/{ticket_id}/assign")
def assign_ticket(ticket_id: int, it_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_admin: models.User = Depends(require_admin)):
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Không tìm thấy yêu cầu")
    
    ticket.assigned_to = it_id
    ticket.status = models.TicketStatus.IN_PROGRESS # Gán xong chuyển trạng thái luôn
    db.commit()

    it_user = db.query(models.User).filter(models.User.id == it_id).first()
    if it_user and ticket.creator:
        email_html = f"<h3>Xin chào {ticket.creator.full_name},</h3><p>IT <b>{it_user.full_name}</b> đã tiếp nhận và đang xử lý yêu cầu <b>#{ticket.id}</b> của bạn.</p>"
        background_tasks.add_task(send_notification_email, ticket.creator.email, f"Cập nhật yêu cầu #{ticket.id}: Đang xử lý", email_html)

    return {"message": "Đã phân công thành công!"}
# ==========================================
# 14. API ĐĂNG XUẤT (Báo cho hệ thống biết User đã Offline)
# ==========================================
@app.post("/logout")
def logout(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    current_user.is_online = False
    db.commit()
    return {"message": "Đã chuyển trạng thái thành Offline"}
# ==========================================
# 15. API CẬP NHẬT TRẠNG THÁI TICKET (Dành cho IT kéo thả Kanban)
# ==========================================
@app.put("/tickets/{ticket_id}/status")
def update_ticket_status(ticket_id: int, status: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Không tìm thấy yêu cầu")
    
    ticket.status = status
    db.commit()

    if ticket.creator:
        email_html = f"<h3>Xin chào {ticket.creator.full_name},</h3><p>Trạng thái yêu cầu <b>#{ticket.id}</b> của bạn đã được cập nhật thành: <b>{status}</b>.</p>"
        background_tasks.add_task(send_notification_email, ticket.creator.email, f"Cập nhật trạng thái yêu cầu #{ticket.id}", email_html)

    return {"message": "Cập nhật trạng thái thành công"}
# ==========================================
# 16. API HỦY TICKET (Dành cho User)
# ==========================================
@app.put("/tickets/{ticket_id}/cancel")
def cancel_ticket(ticket_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id, models.Ticket.created_by == current_user.id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Không tìm thấy yêu cầu")
    
    if ticket.status != models.TicketStatus.OPEN:
        raise HTTPException(status_code=400, detail="Chỉ có thể hủy yêu cầu khi đang ở trạng thái Mới (Open)")
        
    ticket.status = models.TicketStatus.CANCELLED
    db.commit()
    return {"message": "Đã hủy yêu cầu thành công"}

# ==========================================
# 16.1 API CHUYỂN TIẾP TICKET (Dành cho IT)
# ==========================================
@app.put("/tickets/{ticket_id}/escalate")
def escalate_ticket(ticket_id: int, new_assignee_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role not in [models.UserRole.IT_SUPPORTER, models.UserRole.IT_MANAGER]:
        raise HTTPException(status_code=403, detail="Chỉ IT mới có quyền chuyển tiếp")
    
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Không tìm thấy yêu cầu")
        
    new_assignee = db.query(models.User).filter(models.User.id == new_assignee_id).first()
    if not new_assignee:
        raise HTTPException(status_code=404, detail="Không tìm thấy IT")

    ticket.assigned_to = new_assignee.id
    
    # Ghi log lịch sử
    history = models.TicketHistory(
        ticket_id=ticket.id, 
        action="Chuyển tiếp", 
        description=f"{current_user.full_name} đã chuyển tiếp sự cố cho {new_assignee.full_name}"
    )
    db.add(history)
    db.commit()
    return {"message": f"Đã chuyển tiếp cho {new_assignee.full_name}"}
# ==========================================
# 17. API GỬI PHẢN HỒI & ĐÁNH GIÁ SAO (Dành cho User)
# ==========================================
@app.post("/tickets/{ticket_id}/feedback")
def submit_feedback(ticket_id: int, feedback: schemas.FeedbackCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Tìm ticket
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id, models.Ticket.created_by == current_user.id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Không tìm thấy yêu cầu")
    
    # Kiểm tra: Chỉ đánh giá khi IT đã sửa xong (Resolved)
    if ticket.status != models.TicketStatus.RESOLVED:
        raise HTTPException(status_code=400, detail="Bạn chỉ có thể đánh giá khi IT đã xử lý xong (Resolved)")
    
    # Phân tích cảm xúc bằng Gemini AI
    sentiment = "Trung tính"
    if feedback.comment:
        try:
            prompt = f"Phân tích cảm xúc của bình luận sau và CHỈ TRẢ VỀ 1 trong 3 từ (Tích cực, Tiêu cực, Trung tính). Bình luận: '{feedback.comment}'"
            response = client.models.generate_content(model='gemini-2.5-flash', contents=prompt)
            result = response.text.strip().lower()
            if "tiêu cực" in result:
                sentiment = "Tiêu cực"
            elif "tích cực" in result:
                sentiment = "Tích cực"
        except Exception as e:
            print("Lỗi AI sentiment:", e)
    
    # Tạo Feedback mới
    new_feedback = models.Feedback(
        ticket_id=ticket_id,
        rating=feedback.rating,
        comment=feedback.comment,
        sentiment=sentiment
    )
    db.add(new_feedback)
    
    # Cập nhật trạng thái Ticket thành Closed (Chốt)
    ticket.status = models.TicketStatus.CLOSED
    db.commit()

    # Báo cáo khẩn nếu Tiêu cực
    if sentiment == "Tiêu cực":
        email_html = f"<h3>⚠️ Báo Cáo Khẩn Cấp</h3><p>Yêu cầu <b>#{ticket.id}</b> vừa nhận đánh giá TIÊU CỰC ({feedback.rating} sao).</p><p>Nội dung: {feedback.comment}</p><p>Vui lòng kiểm tra trên Dashboard.</p>"
        background_tasks.add_task(send_notification_email, "2224802010159@student.tdmu.edu.vn", f"⚠️ BÁO CÁO KHẨN: Đánh giá tiêu cực Ticket #{ticket.id}", email_html)

    return {"message": "Cảm ơn bạn đã gửi đánh giá!"}

# ==========================================
# 17.1 API LẤY DANH SÁCH FEEDBACK (Admin gọi)
# ==========================================
@app.get("/feedbacks/", response_model=List[schemas.FeedbackAdminResponse])
def get_feedbacks(db: Session = Depends(get_db), current_admin: models.User = Depends(require_admin)):
    return db.query(models.Feedback).order_by(models.Feedback.created_at.desc()).all()
# ==========================================
# 18. API GỬI TIN NHẮN (CHAT) TRONG TICKET
# ==========================================
@app.post("/tickets/{ticket_id}/comments", response_model=schemas.CommentResponse)
def add_comment(
    ticket_id: int, 
    message: str = Form(...),
    is_internal: bool = Form(False),
    files: List[UploadFile] = File(default=[]),
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Không tìm thấy yêu cầu")
    
    image_paths = []
    for file in files:
        if file.filename:
            file_location = f"uploads/chat_{ticket_id}_{current_user.id}_{file.filename}"
            with open(file_location, "wb+") as file_object:
                shutil.copyfileobj(file.file, file_object)
            image_paths.append(f"/{file_location}")
            
    images_str = ",".join(image_paths) if image_paths else None

    new_comment = models.Comment(
        ticket_id=ticket_id,
        user_id=current_user.id,
        message=message,
        is_internal=is_internal,
        attachment_urls=images_str
    )
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)
    return new_comment

# ==========================================
# 19. API BÁO CÁO TIẾN ĐỘ TICKET (Dành cho IT)
# ==========================================
@app.post("/tickets/{ticket_id}/report", response_model=schemas.TicketHistoryResponse)
def add_ticket_report(
    ticket_id: int,
    action: str = Form(...),
    description: str = Form(...),
    files: List[UploadFile] = File(default=[]),
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Không tìm thấy yêu cầu")
    
    if current_user.role not in [models.UserRole.IT_SUPPORTER, models.UserRole.IT_MANAGER]:
         raise HTTPException(status_code=403, detail="Chỉ IT mới có quyền báo cáo tiến độ")
         
    image_paths = []
    for file in files:
        if file.filename:
            file_location = f"uploads/report_{ticket_id}_{current_user.id}_{file.filename}"
            with open(file_location, "wb+") as file_object:
                shutil.copyfileobj(file.file, file_object)
            image_paths.append(f"/{file_location}")
            
    images_str = ",".join(image_paths) if image_paths else None

    history = models.TicketHistory(
        ticket_id=ticket.id, 
        action=action, 
        description=description,
        attachment_urls=images_str
    )
    db.add(history)
    db.commit()
    db.refresh(history)
    return history

# ==========================================
# 20. API LẤY DANH SÁCH IT/ADMIN CHO CHAT NỘI BỘ
# ==========================================
@app.get("/internal-chat/users", response_model=List[schemas.UserResponse])
def get_internal_chat_users(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role == models.UserRole.END_USER:
        raise HTTPException(status_code=403, detail="Không có quyền")
    
    return db.query(models.User).filter(
        models.User.role.in_([models.UserRole.IT_SUPPORTER, models.UserRole.IT_MANAGER])
    ).all()

# ==========================================
# 21. API GỬI TIN NHẮN NỘI BỘ
# ==========================================
@app.post("/internal-chat/messages", response_model=schemas.InternalMessageResponse)
def send_internal_message(
    receiver_id: int = Form(...),
    message: str = Form(""),
    related_ticket_id: int = Form(None),
    files: List[UploadFile] = File(default=[]),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role == models.UserRole.END_USER:
        raise HTTPException(status_code=403, detail="Không có quyền")

    image_paths = []
    for file in files:
        if file.filename:
            file_location = f"uploads/dm_{current_user.id}_{receiver_id}_{file.filename}"
            with open(file_location, "wb+") as file_object:
                shutil.copyfileobj(file.file, file_object)
            image_paths.append(f"/{file_location}")
            
    images_str = ",".join(image_paths) if image_paths else None

    new_msg = models.InternalMessage(
        sender_id=current_user.id,
        receiver_id=receiver_id,
        message=message,
        attachment_urls=images_str,
        related_ticket_id=related_ticket_id
    )
    db.add(new_msg)
    db.commit()
    db.refresh(new_msg)
    return new_msg

# ==========================================
# 22. API LẤY LỊCH SỬ CHAT VỚI 1 USER
# ==========================================
@app.get("/internal-chat/messages/{user_id}", response_model=List[schemas.InternalMessageResponse])
def get_internal_messages(user_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if current_user.role == models.UserRole.END_USER:
        raise HTTPException(status_code=403, detail="Không có quyền")

    messages = db.query(models.InternalMessage).filter(
        or_(
            (models.InternalMessage.sender_id == current_user.id) & (models.InternalMessage.receiver_id == user_id),
            (models.InternalMessage.sender_id == user_id) & (models.InternalMessage.receiver_id == current_user.id)
        )
    ).order_by(models.InternalMessage.created_at).all()
    return messages

# ==========================================
# 23. API ĐÁNH GIÁ TICKET (Admin)
# ==========================================
@app.put("/tickets/{ticket_id}/evaluate")
def evaluate_ticket(ticket_id: int, eval_data: schemas.TicketEvaluate, db: Session = Depends(get_db), current_admin: models.User = Depends(require_admin)):
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Không tìm thấy yêu cầu")
    
    ticket.category = eval_data.category
    ticket.priority = eval_data.priority
    ticket.severity = eval_data.severity
    ticket.admin_notes = eval_data.admin_notes
    db.commit()
    return {"message": "Đánh giá thành công"}

# ==========================================
# 24. API AUTO ASSIGN (Admin)
# ==========================================
@app.post("/tickets/{ticket_id}/auto-assign")
def auto_assign_ticket(ticket_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_admin: models.User = Depends(require_admin)):
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Không tìm thấy yêu cầu")
    
    online_its = db.query(models.User).filter(
        models.User.role == models.UserRole.IT_SUPPORTER,
        models.User.is_online == True
    ).all()
    
    if not online_its:
        raise HTTPException(status_code=400, detail="Không có IT nào đang Online để tự động gán")
    
    from sqlalchemy import func
    it_ticket_counts = {}
    for it in online_its:
        count = db.query(func.count(models.Ticket.id)).filter(
            models.Ticket.assigned_to == it.id,
            models.Ticket.status == models.TicketStatus.IN_PROGRESS
        ).scalar()
        it_ticket_counts[it.id] = count
    
    best_it_id = min(it_ticket_counts, key=it_ticket_counts.get)
    best_it = db.query(models.User).filter(models.User.id == best_it_id).first()
    
    ticket.assigned_to = best_it_id
    ticket.status = models.TicketStatus.IN_PROGRESS
    
    history = models.TicketHistory(
        ticket_id=ticket.id, 
        action="Phân công Tự động", 
        description=f"Hệ thống đã tự động gán yêu cầu cho {best_it.full_name} (đang rảnh nhất)"
    )
    db.add(history)
    db.commit()
    
    if ticket.creator:
        email_html = f"<h3>Xin chào {ticket.creator.full_name},</h3><p>Hệ thống tự động điều phối yêu cầu <b>#{ticket.id}</b> của bạn cho IT <b>{best_it.full_name}</b>.</p>"
        background_tasks.add_task(send_notification_email, ticket.creator.email, f"Cập nhật: Đã phân công IT cho Ticket #{ticket.id}", email_html)
        
    return {"message": f"Hệ thống đã tự động gán cho {best_it.full_name}"}

# ==========================================
# 25. API TẠO SUB-TASKS (Admin)
# ==========================================
@app.post("/tickets/{ticket_id}/tasks")
def create_ticket_task(ticket_id: int, task: schemas.TicketTaskCreate, db: Session = Depends(get_db), current_admin: models.User = Depends(require_admin)):
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Không tìm thấy yêu cầu")
    
    new_task = models.TicketTask(
        ticket_id=ticket_id,
        assignee_id=task.assignee_id,
        task_description=task.task_description
    )
    db.add(new_task)
    db.commit()
    return {"message": "Tạo nhiệm vụ thành công"}

# ==========================================
# 26. API CẬP NHẬT TRẠNG THÁI TASK
# ==========================================
@app.put("/tickets/tasks/{task_id}")
def update_task_status(task_id: int, is_completed: bool, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    task = db.query(models.TicketTask).filter(models.TicketTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Không tìm thấy nhiệm vụ")
    
    if current_user.role == models.UserRole.IT_SUPPORTER and task.assignee_id != current_user.id:
        raise HTTPException(status_code=403, detail="Không thể cập nhật nhiệm vụ của người khác")
        
    task.is_completed = is_completed
    db.commit()
    return {"message": "Đã cập nhật trạng thái nhiệm vụ"}