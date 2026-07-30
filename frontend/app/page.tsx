import { redirect } from 'next/navigation';

export default function Home() {
  // Lệnh này sẽ ngay lập tức đẩy người dùng sang trang /login
  // mỗi khi họ truy cập vào thư mục gốc (localhost:3000)
  redirect('/login');
}