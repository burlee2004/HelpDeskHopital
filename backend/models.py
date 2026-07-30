from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Enum, Text
from sqlalchemy.orm import relationship
from database import Base
import datetime
import enum
# Thêm vào file models.py
from sqlalchemy.sql import func
class ChatHistory(Base):
    __tablename__ = "chat_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Nếu có quan hệ (relationship) với User thì thêm:
    # user = relationship("User", back_populates="chat_histories")
class UserRole(str, enum.Enum):
    END_USER = "End-User"
    IT_SUPPORTER = "IT-Supporter"
    IT_MANAGER = "IT-Manager"

class TicketStatus(str, enum.Enum):
    OPEN = "Open"
    IN_PROGRESS = "In Progress"
    PENDING = "Pending"
    RESOLVED = "Resolved"
    CLOSED = "Closed"
    CANCELLED = "Cancelled" # <-- Trạng thái Hủy

class Department(Base):
    __tablename__ = "departments"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String, nullable=True)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(Enum(UserRole), default=UserRole.END_USER)
    is_active = Column(Boolean, default=True)
    is_online = Column(Boolean, default=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    room_number = Column(String, nullable=True)

    # Relationships
    department = relationship("Department")
    tickets_created = relationship("Ticket", foreign_keys="Ticket.created_by", back_populates="creator")
    tickets_assigned = relationship("Ticket", foreign_keys='Ticket.assigned_to', back_populates="assignee")

class Ticket(Base):
    __tablename__ = "tickets"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(String)
    category = Column(String)
    priority = Column(String)
    severity = Column(String, default="Bình thường")
    admin_notes = Column(String, nullable=True)
    image_urls = Column(String, nullable=True)
    status = Column(Enum(TicketStatus), default=TicketStatus.OPEN)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    created_by = Column(Integer, ForeignKey("users.id"))
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)

    creator = relationship("User", foreign_keys=[created_by], back_populates="tickets_created")
    assignee = relationship("User", foreign_keys=[assigned_to], back_populates="tickets_assigned")
    feedback = relationship("Feedback", back_populates="ticket", uselist=False)
    comments = relationship("Comment", back_populates="ticket", order_by="Comment.created_at")

    # THÊM DÒNG NÀY ĐỂ NỐI TICKET VỚI LỊCH SỬ CHAT (COMMENTS) VÀ TASKS
    comments = relationship("Comment", back_populates="ticket", order_by="Comment.created_at")
    histories = relationship("TicketHistory", back_populates="ticket", order_by="TicketHistory.created_at")
    tasks = relationship("TicketTask", back_populates="ticket", order_by="TicketTask.id")

# ==================================
# BẢNG NHIỆM VỤ PHỤ (SUB-TASKS)
# ==================================
class TicketTask(Base):
    __tablename__ = "ticket_tasks"
    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"))
    assignee_id = Column(Integer, ForeignKey("users.id")) # IT được giao việc
    task_description = Column(String, nullable=False)
    is_completed = Column(Boolean, default=False)

    ticket = relationship("Ticket", back_populates="tasks")
    assignee = relationship("User")

# ==================================
# BẢNG COMMENT (CHAT TRAO ĐỔI)
# ==================================
class Comment(Base):
    __tablename__ = "comments"
    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"))
    user_id = Column(Integer, ForeignKey("users.id")) # ID của người gửi tin nhắn
    message = Column(String)
    attachment_urls = Column(String, nullable=True) # Lưu trữ ảnh/video trong chat nội bộ
    is_internal = Column(Boolean, default=False) # Đánh dấu ghi chú nội bộ (chỉ IT mới thấy)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    ticket = relationship("Ticket", back_populates="comments")
    user = relationship("User") # Để biết tên và Role người gửi
# ==================================
# BẢNG FEEDBACK (BẢNG MỚI HOÀN TOÀN)
# ==================================
class Feedback(Base):
    __tablename__ = "feedbacks"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"))
    rating = Column(Integer) # Đánh giá từ 1 đến 5 sao
    comment = Column(String) # Bình luận của User
    sentiment = Column(String, nullable=True) # Cảm xúc (Tích cực, Tiêu cực, Trung tính) do AI đánh giá
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    ticket = relationship("Ticket", back_populates="feedback")
    # ==================================
# BẢNG LỊCH SỬ TIẾN ĐỘ TICKET (MỚI)
# ==================================
class TicketHistory(Base):
    __tablename__ = "ticket_histories"

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"))
    action = Column(String) # Ví dụ: "Tạo mới", "Phân công", "Đang xử lý"
    description = Column(String) # Ví dụ: "Yêu cầu được phân công cho Nguyễn Văn IT"
    attachment_urls = Column(String, nullable=True) # Lưu link ảnh/video phân cách bằng dấu phẩy
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    ticket = relationship("Ticket", back_populates="histories")

# ==================================
# BẢNG TIN NHẮN NỘI BỘ (IT & ADMIN)
# ==================================
class InternalMessage(Base):
    __tablename__ = "internal_messages"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"))
    receiver_id = Column(Integer, ForeignKey("users.id"))
    message = Column(String)
    attachment_urls = Column(String, nullable=True)
    related_ticket_id = Column(Integer, ForeignKey("tickets.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    sender = relationship("User", foreign_keys=[sender_id])
    receiver = relationship("User", foreign_keys=[receiver_id])
    related_ticket = relationship("Ticket")