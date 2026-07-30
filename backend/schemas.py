from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# THÊM MỚI SCHEMA CHO PHÒNG BAN
class DepartmentBase(BaseModel):
    name: str
    description: Optional[str] = None

class DepartmentCreate(DepartmentBase):
    pass

class DepartmentResponse(DepartmentBase):
    id: int
    class Config: from_attributes = True

# Form dùng để Admin tạo tài khoản cho nhân viên
class UserCreate(BaseModel):
    full_name: str
    email: str
    password: str
    role: str  # Gửi lên 1 trong 3: End-User, IT-Supporter, IT-Manager
    department_id: Optional[int] = None
    room_number: Optional[str] = None

# Dữ liệu trả về khi lấy thông tin User (ẩn mật khẩu đi)
class UserResponse(BaseModel):
    id: int
    full_name: str
    email: str
    role: str
    is_active: bool
    is_online: bool
    department_id: Optional[int] = None
    room_number: Optional[str] = None
    department: Optional[DepartmentResponse] = None

class ChatRequest(BaseModel):
    question: str

class ChatResponse(BaseModel):
    id: int
    question: str
    answer: str
    created_at: datetime
# THÊM MỚI SCHEMA CHO FEEDBACK
class FeedbackCreate(BaseModel):
    rating: int
    comment: str

class FeedbackResponse(BaseModel):
    id: int
    rating: int
    comment: str
    sentiment: Optional[str] = None
    created_at: datetime
    
    class Config: from_attributes = True

class Config:
    from_attributes = True

# --- SCHEMA CHO TICKET TASKS (SUB-TASKS) ---
class TicketTaskCreate(BaseModel):
    assignee_id: int
    task_description: str

class TicketTaskResponse(BaseModel):
    id: int
    ticket_id: int
    assignee_id: int
    task_description: str
    is_completed: bool
    assignee: UserResponse
    class Config: from_attributes = True

# --- SCHEMA CHO TICKET ---
class TicketCreate(BaseModel):
    title: str
    description: str
    category: str
    priority: str

class TicketEvaluate(BaseModel):
    category: str
    priority: str
    severity: str
    admin_notes: Optional[str] = None
# THÊM MỚI SCHEMA CHO CHAT
class CommentUser(BaseModel):
    full_name: str
    role: str
    class Config: from_attributes = True

class CommentCreate(BaseModel):
    message: str
    is_internal: Optional[bool] = False

class CommentResponse(BaseModel):
    id: int
    message: str
    is_internal: bool
    attachment_urls: Optional[str] = None
    created_at: datetime
    user: CommentUser # Lấy tên và chức vụ người gửi
    class Config: from_attributes = True

class TicketHistoryResponse(BaseModel):
    id: int
    action: str
    description: str
    attachment_urls: Optional[str] = None
    created_at: datetime
    class Config: from_attributes = True

class FeedbackAdminResponse(BaseModel):
    id: int
    ticket_id: int
    rating: int
    comment: str
    sentiment: Optional[str] = None
    created_at: datetime
    ticket: "TicketResponse"
    
    class Config: from_attributes = True

class TicketResponse(BaseModel):
    id: int
    title: str
    description: str
    category: str
    priority: str
    severity: str
    admin_notes: Optional[str] = None
    image_urls: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime
    creator: UserResponse
    assignee: Optional[UserResponse] = None
    tasks: Optional[List[TicketTaskResponse]] = []
    histories: List[TicketHistoryResponse] = []
    feedback: Optional[FeedbackResponse] = None
    # THÊM DÒNG NÀY ĐỂ LẤY TOÀN BỘ TIN NHẮN KHI XEM TICKET
    comments: List[CommentResponse] = []

    class Config:
        from_attributes = True

class InternalMessageResponse(BaseModel):
    id: int
    sender_id: int
    receiver_id: int
    message: str
    attachment_urls: Optional[str] = None
    related_ticket_id: Optional[int] = None
    created_at: datetime
    sender: CommentUser
    receiver: CommentUser

    class Config: from_attributes = True

# Dữ liệu trả về khi Login thành công
class Token(BaseModel):
    access_token: str
    token_type: str
    role: str  # Phải trả về Role để Frontend biết đường điều hướng