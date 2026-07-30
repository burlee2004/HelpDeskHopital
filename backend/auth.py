from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import jwt

# Cấu hình Secret Key (Chìa khóa để tạo Token, bạn có thể đổi thành chuỗi bất kỳ)
SECRET_KEY = "Helpdesk_Secret_Key_Super_Safe"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 # Token sống trong 60 phút

# Công cụ mã hóa mật khẩu
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Hàm kiểm tra mật khẩu
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

# Hàm băm mật khẩu trước khi lưu vào DB
def get_password_hash(password):
    return pwd_context.hash(password)

# Hàm tạo JWT Token khi đăng nhập thành công
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt