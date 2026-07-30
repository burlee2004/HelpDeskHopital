"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function TicketTrackingPage() {
  const params = useParams();
  const router = useRouter();
  const ticketId = params.id;
  
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTicketDetail = async () => {
      const token = localStorage.getItem("token");
      if (!token) { router.push("/login"); return; }
      
      try {
        // Gọi API lấy toàn bộ danh sách rồi lọc ra cái đang cần (Hoặc bạn có thể tự viết thêm 1 API GET /tickets/{id} ở backend cho tối ưu)
        const res = await fetch("http://127.0.0.1:8000/tickets/", { headers: { Authorization: `Bearer ${token}` }});
        if (res.ok) {
          const allTickets = await res.json();
          const currentTicket = allTickets.find((t: any) => t.id === parseInt(ticketId as string));
          setTicket(currentTicket);
        }
      } catch (error) { console.error(error); }
      setLoading(false);
    };
    fetchTicketDetail();
  }, [ticketId, router]);

  const formatTime = (timeString: string) => new Date(timeString).toLocaleString('vi-VN');

  if (loading) return <div className="min-h-screen flex items-center justify-center">Đang tải dữ liệu...</div>;
  if (!ticket) return <div className="min-h-screen flex items-center justify-center">Không tìm thấy Yêu cầu này!</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-gray-900 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Nút quay lại */}
        <button onClick={() => router.push("/user/home")} className="text-blue-600 hover:text-blue-800 font-medium mb-6 flex items-center gap-2 transition">
          &larr; Quay lại trang chủ
        </button>

        {/* Khung thông tin tổng quan */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-8">
          <div className="flex justify-between items-start border-b border-gray-100 pb-6 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{ticket.title}</h1>
              <p className="text-gray-500 font-mono">Mã số: #{ticket.id} | Phân loại: {ticket.category}</p>
              {ticket.assignee && (
                <p className="text-sm font-semibold text-blue-600 mt-2 flex items-center gap-1">
                  👨‍💻 IT Phụ trách: {ticket.assignee.full_name}
                </p>
              )}
            </div>
            <div className="text-right">
              <span className={`px-4 py-2 rounded-full text-sm font-bold shadow-sm ${ticket.status === 'Resolved' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                Trạng thái: {ticket.status}
              </span>
            </div>
          </div>
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-gray-700">
            {ticket.description}
          </div>
        </div>

        {/* KHUNG TIMELINE TIẾN ĐỘ */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-8 border-b pb-4">📍 Theo dõi Tiến trình Xử lý</h2>
          
          <div className="relative border-l-2 border-blue-200 ml-3 md:ml-6 space-y-8">
            
            {/* Nếu backend chưa có History, ta lấy mảng histories hoặc map tạm từ dữ liệu tĩnh */}
            {ticket.histories && ticket.histories.length > 0 ? (
              ticket.histories.map((step: any, index: number) => (
                <div key={index} className="relative pl-8 md:pl-10">
                  {/* Dấu chấm Timeline */}
                  <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-blue-500 ring-4 ring-blue-50"></div>
                  
                  <div className="bg-white border border-gray-100 p-4 rounded-lg shadow-sm hover:shadow-md transition">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-1">
                      <h4 className="text-lg font-bold text-blue-900">{step.action}</h4>
                      <span className="text-sm text-gray-400 font-mono">{formatTime(step.created_at)}</span>
                    </div>
                    <p className="text-gray-600">{step.description}</p>
                    {step.attachment_urls && (
                      <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2 flex-wrap">
                        {step.attachment_urls.split(',').map((url: string, i: number) => {
                           const isVideo = url.toLowerCase().endsWith('.mp4') || url.toLowerCase().endsWith('.webm');
                           if (isVideo) {
                             return <video key={i} src={`http://127.0.0.1:8000${url}`} controls className="h-32 rounded-lg border shadow-sm" />;
                           }
                           return <img key={i} src={`http://127.0.0.1:8000${url}`} alt="Tiến độ" className="h-32 object-cover rounded-lg border shadow-sm" />;
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-gray-500 italic pl-8">Hệ thống đang đồng bộ dữ liệu tiến trình...</div>
            )}

            {/* Trạng thái hiện tại nhấp nháy nếu chưa đóng */}
            {ticket.status !== 'Closed' && (
              <div className="relative pl-8 md:pl-10 opacity-70">
                <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-orange-400 ring-4 ring-orange-50 animate-ping"></div>
                <h4 className="text-lg font-semibold text-orange-600 mt-0.5">Đang chờ cập nhật tiếp theo...</h4>
              </div>
            )}
            
          </div>
        </div>

      </div>
    </div>
  );
}