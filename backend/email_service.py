import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# ==========================================
# CẤU HÌNH EMAIL GỬI ĐI
# ==========================================
# Ghi chú: Bạn cần dùng Gmail và tạo "Mật khẩu ứng dụng" (App Password) 
# chứ không dùng mật khẩu đăng nhập bình thường.
SENDER_EMAIL = "2224802010159@student.tdmu.edu.vn" # Thay bằng email của bạn
SENDER_PASSWORD = "lxbi wpmp htrl enbj" # Thay bằng App Password 16 ký tự

def send_notification_email(to_email: str, subject: str, html_content: str):
    try:
        msg = MIMEMultipart()
        msg['From'] = f"IT Helpdesk Hospital <{SENDER_EMAIL}>"
        msg['To'] = to_email
        msg['Subject'] = subject

        msg.attach(MIMEText(html_content, 'html'))

        # Kết nối tới server Gmail
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        server.send_message(msg)
        server.quit()
        print(f"📧 Đã gửi email thông báo tới: {to_email}")
    except Exception as e:
        print(f"⚠️ Lỗi khi gửi email: {e}")