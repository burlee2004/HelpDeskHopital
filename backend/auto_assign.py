import random
from sqlalchemy.orm import Session
import models

def auto_assign_ticket(ticket_id: int, db: Session):
    """
    🤖 BOT TỰ ĐỘNG ĐIỀU PHỐI TICKET THÔNG MINH (Bản nâng cấp)
    Chiến lược: Giao việc cho nhân viên IT đang ONLINE và đang ÍT VIỆC nhất.
    Nếu có nhiều người rảnh ngang nhau -> Bốc thăm ngẫu nhiên để chia đều.
    """
    # 1. Tìm thông tin Ticket vừa mới tạo
    ticket = db.query(models.Ticket).filter(models.Ticket.id == ticket_id).first()
    if not ticket:
        return

    # 2. Lấy danh sách toàn bộ nhân viên IT đang ONLINE
    online_its = db.query(models.User).filter(
        models.User.role == models.UserRole.IT_SUPPORTER,
        models.User.is_online == True
    ).all()

    # Nếu không có IT nào online, hệ thống giữ nguyên trạng thái 'Open'
    if not online_its:
        print(f"⚠️ [BOT]: Không có IT nào online. Ticket #{ticket_id} được giữ ở trạng thái Chờ điều phối.")
        return

    # 3. Tính toán khối lượng công việc (Workload) thực tế
    it_workload = []
    for it in online_its:
        # Đếm TẤT CẢ công việc chưa hoàn thành (Mới giao, Đang xử lý, Tạm dừng)
        active_jobs_count = db.query(models.Ticket).filter(
            models.Ticket.assigned_to == it.id,
            models.Ticket.status.in_([
                models.TicketStatus.OPEN, 
                models.TicketStatus.IN_PROGRESS, 
                models.TicketStatus.PENDING
            ])
        ).count()
        
        it_workload.append({
            "it_user": it,
            "job_count": active_jobs_count
        })

    # 4. Tìm ra số lượng công việc ít nhất hiện tại (Ví dụ: min là 0)
    min_jobs = min(workload["job_count"] for workload in it_workload)
    
    # 5. Lọc ra danh sách những IT đang có số việc bằng với min_jobs
    candidates = [item["it_user"] for item in it_workload if item["job_count"] == min_jobs]
    
    # 6. Bốc thăm ngẫu nhiên 1 người trong nhóm rảnh rỗi nhất để chia đều việc
    chosen_it = random.choice(candidates)

    # 7. Thực hiện gán việc cho IT đó
    ticket.assigned_to = chosen_it.id
    ticket.status = models.TicketStatus.IN_PROGRESS
    
    db.commit()
    print(f"🤖 [BOT]: Đã tự động giao Ticket #{ticket_id} cho IT [{chosen_it.full_name}] (Đang xử lý {min_jobs} việc).")