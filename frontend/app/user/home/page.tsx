"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ChatbotWidget from "./components/ChatbotWidget"; 

export default function UserHome() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("my-tickets"); 
  const [tickets, setTickets] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  
  const [formData, setFormData] = useState({ title: "", category: "Phần cứng", priority: "Không gấp", description: "" });
  const [customCategory, setCustomCategory] = useState(""); 
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]); 
  const [message, setMessage] = useState("");

  // State cho phần Feedback
  const [feedbackData, setFeedbackData] = useState({ rating: 5, comment: "" });

  const getToken = () => localStorage.getItem("token");

  const handleAiFallback = (chatLog: string) => {
    setActiveTab("create");
    setSelectedTicket(null);
    setFormData(prev => ({ ...prev, description: chatLog }));
  };

  const fetchTicketsList = async (token: string) => {
    try {
      const resTickets = await fetch("http://127.0.0.1:8000/tickets/", { headers: { Authorization: `Bearer ${token}` }});
      if (resTickets.ok) setTickets(await resTickets.json());
    } catch (error) { console.error(error); }
  }

  useEffect(() => {
    const fetchData = async () => {
      const token = getToken();
      if (!token) { router.push("/login"); return; }
      try {
        const resUser = await fetch("http://127.0.0.1:8000/users/me", { headers: { Authorization: `Bearer ${token}` }});
        if (resUser.ok) setCurrentUser(await resUser.json());
        fetchTicketsList(token);
      } catch (error) { console.error(error); }
    };
    fetchData();
  }, [router]);

  // ĐÃ SỬA: Tăng giới hạn lên 5 tấm ảnh
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      if (filesArray.length > 5) { 
        alert("Chỉ được tải lên tối đa 5 hình ảnh!"); 
        return; 
      }
      setSelectedFiles(filesArray);
    }
  };

  const handleCancelTicket = async (ticketId: number) => {
    if(!confirm("Bạn có chắc chắn muốn hủy yêu cầu này?")) return;
    try {
      const res = await fetch(`http://127.0.0.1:8000/tickets/${ticketId}/cancel`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) {
        alert("Đã hủy thành công!");
        setSelectedTicket(null);
        fetchTicketsList(getToken() as string);
      } else {
        const err = await res.json();
        alert(err.detail);
      }
    } catch (error) { console.error(error); }
  };

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSend = new FormData();
    dataToSend.append("title", formData.title);
    dataToSend.append("description", formData.description);
    dataToSend.append("priority", formData.priority);
    
    const finalCategory = formData.category === "Khác" ? customCategory : formData.category;
    if(!finalCategory) { alert("Vui lòng nhập danh mục lỗi!"); return; }
    dataToSend.append("category", finalCategory);

    selectedFiles.forEach((file) => { dataToSend.append("files", file); });

    try {
      const res = await fetch("http://127.0.0.1:8000/tickets/", {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: dataToSend,
      });

      if (res.ok) {
        setMessage("Đã gửi yêu cầu thành công!");
        setFormData({ title: "", category: "Phần cứng", priority: "Không gấp", description: "" });
        setCustomCategory("");
        setSelectedFiles([]);
        fetchTicketsList(getToken() as string);
        setTimeout(() => { setMessage(""); setActiveTab("my-tickets"); }, 2000);
      }
    } catch (err) { console.error(err); }
  };

  // HÀM GỬI FEEDBACK
  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!feedbackData.comment) { alert("Vui lòng nhập bình luận đánh giá!"); return; }

    try {
      const res = await fetch(`http://127.0.0.1:8000/tickets/${selectedTicket.id}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(feedbackData),
      });

      if (res.ok) {
        alert("Cảm ơn bạn đã đánh giá! Yêu cầu này đã được đóng.");
        setSelectedTicket(null); // Quay lại danh sách
        fetchTicketsList(getToken() as string); // Load lại ds
      } else {
        const err = await res.json();
        alert(err.detail);
      }
    } catch (error) { console.error(error); }
  };

  const formatTime = (timeString: string) => new Date(timeString).toLocaleString('vi-VN');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Open": return <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-semibold">Mới gửi</span>;
      case "In Progress": return <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold">IT Đang xử lý</span>;
      case "Pending": return <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-semibold">Chờ phản hồi</span>;
      case "Resolved": return <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold">Đã giải quyết</span>;
      case "Closed": return <span className="bg-gray-800 text-white px-3 py-1 rounded-full text-xs font-semibold">Đã Đóng</span>;
      case "Cancelled": return <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-semibold">Đã Hủy</span>;
      default: return null;
    }
  };

  const handleLogout = async () => {
    const token = localStorage.getItem("token");
    if (token) {
      try { await fetch("http://127.0.0.1:8000/logout", { method: "POST", headers: { Authorization: `Bearer ${token}` } }); } 
      catch (error) { console.error(error); }
    }
    localStorage.removeItem("token");
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-gray-900">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center gap-3">
                <div className="bg-teal-500 text-white p-2 rounded-xl shadow-sm">🏥</div>
                <span className="font-extrabold text-xl text-teal-700 tracking-tight">Cổng Hỗ Trợ CNTT</span>
              </div>
              <div className="hidden sm:-my-px sm:ml-8 sm:flex sm:space-x-8">
                <button onClick={() => {setActiveTab("my-tickets"); setSelectedTicket(null);}} className={`${activeTab === "my-tickets" ? "border-teal-500 text-teal-700 font-bold" : "border-transparent text-gray-500 font-medium"} inline-flex items-center px-1 pt-1 border-b-2 text-sm transition-colors`}>Yêu cầu của tôi</button>
                <button onClick={() => {setActiveTab("create"); setSelectedTicket(null);}} className={`${activeTab === "create" ? "border-teal-500 text-teal-700 font-bold" : "border-transparent text-gray-500 font-medium"} inline-flex items-center px-1 pt-1 border-b-2 text-sm transition-colors`}>+ Gửi yêu cầu mới</button>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-gray-700">{currentUser ? currentUser.full_name : "Đang tải..."}</p>
              </div>
              <button onClick={handleLogout} className="bg-gray-100 px-3 py-1.5 rounded-md text-sm">Đăng xuất</button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 pb-24">
        
        {/* --- XEM CHI TIẾT TICKET & PHẢN HỒI --- */}
        {selectedTicket && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in-up max-w-4xl mx-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-semibold text-gray-800">Chi tiết sự cố #{selectedTicket.id}</h3>
              <button onClick={() => setSelectedTicket(null)} className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center gap-1 hover:underline">
                &larr; Quay lại
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedTicket.title}</h2>
                  <div className="flex flex-wrap gap-3 mt-4 items-center">
                    {getStatusBadge(selectedTicket.status)}
                    <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-semibold">🏷️ {selectedTicket.category}</span>
                  </div>
                </div>
                {selectedTicket.status === 'Open' && (
                  <button onClick={() => handleCancelTicket(selectedTicket.id)} className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg font-medium hover:bg-red-500 hover:text-white transition">
                    Hủy Yêu Cầu
                  </button>
                )}
              </div>
              
              <div className="bg-slate-50 p-5 rounded-lg border border-slate-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Mô tả chi tiết:</h4>
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{selectedTicket.description}</p>
              </div>

              {selectedTicket.image_urls && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Hình ảnh đính kèm:</h4>
                  <div className="flex gap-4 flex-wrap">
                    {selectedTicket.image_urls.split(',').map((url: string, index: number) => (
                      <img key={index} src={`http://127.0.0.1:8000${url}`} alt="Lỗi đính kèm" className="h-32 object-cover rounded-lg border shadow-sm" />
                    ))}
                  </div>
                </div>
              )}

              {/* KHU VỰC CHAT CHO USER */}
              <div className="border-t border-gray-100 pt-6 mt-6">
                <h3 className="font-bold text-lg mb-4 text-gray-800">💬 Khung Trao Đổi</h3>
                <div className="bg-gray-100 p-4 rounded-lg h-64 overflow-y-auto mb-4 flex flex-col gap-3 border">
                  {(() => {
                    const visibleComments = selectedTicket.comments?.filter((c: any) => !c.is_internal) || [];
                    if (visibleComments.length === 0) return <p className="text-center text-gray-400 mt-10">Chưa có tin nhắn nào.</p>;
                    return visibleComments.map((c: any) => (
                      <div key={c.id} className={`p-3 rounded-lg max-w-[80%] ${c.user.role === 'End-User' ? 'bg-blue-100 text-blue-900 self-end' : 'bg-white border self-start'}`}>
                        <div className="text-xs font-bold mb-1 opacity-70">{c.user.full_name} • {formatTime(c.created_at)}</div>
                        <p>{c.message}</p>
                      </div>
                    ));
                  })()}
                </div>
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!message.trim()) return; 
                    try {
                      const formDataToSend = new FormData();
                      formDataToSend.append("message", message);
                      const res = await fetch(`http://127.0.0.1:8000/tickets/${selectedTicket.id}/comments`, {
                        method: "POST", headers: { Authorization: `Bearer ${getToken()}` },
                        body: formDataToSend
                      });
                      if (res.ok) {
                        const newComment = await res.json();
                        setSelectedTicket({ ...selectedTicket, comments: [...(selectedTicket.comments || []), newComment] });
                        setMessage(""); 
                      }
                    } catch (error) {}
                  }} 
                  className="flex gap-2"
                >
                  <input type="text" value={message} onChange={e => setMessage(e.target.value)} placeholder="Phản hồi cho IT..." className="flex-1 border rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
                  <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold">Gửi</button>
                </form>
              </div>
              
              {/* KHU VỰC FEEDBACK */}
              {selectedTicket.status === 'Resolved' && (
                <div className="mt-8 border-t-2 border-dashed border-blue-200 pt-6">
                  <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                    <h3 className="text-lg font-bold text-blue-900 mb-2">Nghiệm thu & Đánh giá</h3>
                    <p className="text-sm text-blue-700 mb-4">Nhân viên IT đã xử lý xong sự cố của bạn. Vui lòng để lại đánh giá để đóng yêu cầu này.</p>
                    <form onSubmit={handleSubmitFeedback} className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-2">Đánh giá sao (1-5)</label>
                        <div className="flex gap-2">
                          {[1,2,3,4,5].map(star => (
                            <button 
                              key={star} type="button" 
                              onClick={() => setFeedbackData({...feedbackData, rating: star})}
                              className={`text-3xl transition-transform ${feedbackData.rating >= star ? 'text-yellow-400 scale-110' : 'text-gray-300'}`}
                            >★</button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-2">Bình luận của bạn</label>
                        <textarea 
                          value={feedbackData.comment}
                          onChange={(e) => setFeedbackData({...feedbackData, comment: e.target.value})}
                          className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none" 
                          rows={3} placeholder="Ví dụ: Cảm ơn IT đã hỗ trợ nhanh chóng!" required
                        ></textarea>
                      </div>
                      <button type="submit" className="bg-green-600 text-white font-bold px-6 py-2 rounded-lg hover:bg-green-700 transition w-full">
                        Gửi Đánh Giá & Đóng Yêu Cầu
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* HIỂN THỊ ĐÁNH GIÁ NẾU ĐÃ ĐÓNG */}
              {selectedTicket.status === 'Closed' && selectedTicket.feedback && (
                <div className="mt-8 border-t border-gray-100 pt-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Đánh giá của bạn:</h4>
                  <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-yellow-500 font-bold text-lg">{'★'.repeat(selectedTicket.feedback.rating)}{'☆'.repeat(5-selectedTicket.feedback.rating)}</span>
                      <span className="text-xs text-gray-500">({formatTime(selectedTicket.feedback.created_at)})</span>
                    </div>
                    <p className="text-gray-800 italic">"{selectedTicket.feedback.comment}"</p>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* TAB 1: DANH SÁCH YÊU CẦU */}
        {activeTab === "my-tickets" && !selectedTicket && (
          <div className="space-y-6 animate-fade-in-up">
            <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Xin chào, {currentUser ? currentUser.full_name.split(' ').pop() : "bạn"}! 👋</h1>
                <p className="text-gray-500 mt-1">Bạn có <strong className="text-blue-600">{tickets.filter(t => t.status === 'Open' || t.status === 'In Progress' || t.status === 'Pending').length}</strong> yêu cầu đang xử lý. Bạn có <strong>{tickets.filter(t => t.status === 'Resolved').length}</strong> yêu cầu cần nghiệm thu.</p>
              </div>
              <button onClick={() => setActiveTab("create")} className="bg-teal-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-teal-600/30 hover:bg-teal-700 hover:scale-[1.02] transition-all flex items-center gap-2">
                <span className="text-lg">+</span> Báo Lỗi Mới
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                <h3 className="text-lg font-semibold text-gray-800">Lịch sử yêu cầu hỗ trợ</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {tickets.map((ticket) => (
                  <div key={ticket.id} className="p-6 hover:bg-slate-50 transition flex flex-col sm:flex-row justify-between gap-4">
                    <div className="flex-1 cursor-pointer" onClick={() => setSelectedTicket(ticket)}>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-sm font-mono text-gray-400">#{ticket.id}</span>
                        <h4 className="text-lg font-semibold text-gray-900">{ticket.title}</h4>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
                        <span className="flex items-center gap-1">🏷️ {ticket.category}</span>
                        <span className="flex items-center gap-1">🕒 {formatTime(ticket.created_at)}</span>
                        {ticket.status === 'Resolved' && <span className="text-red-500 font-bold animate-pulse">Cần bạn đánh giá!</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {getStatusBadge(ticket.status)}
                      <button 
                          onClick={() => router.push(`/user/home/ticket/${ticket.id}`)} 
                          className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg font-medium hover:bg-blue-100 transition shadow-sm text-sm"
                      >
                          Theo dõi tiến độ &rarr;
                      </button> 
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: FORM TẠO YÊU CẦU */}
        {activeTab === "create" && !selectedTicket && (
          <div className="max-w-4xl mx-auto animate-fade-in-up">
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
              {/* Header Gradient */}
              <div className="px-10 py-8 bg-gradient-to-r from-teal-500 to-emerald-600 text-white flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-extrabold tracking-tight">Gửi Yêu Cầu Hỗ Trợ</h2>
                  <p className="mt-2 text-teal-100 text-sm">Vui lòng cung cấp chi tiết sự cố để đội ngũ IT hỗ trợ bạn nhanh nhất.</p>
                </div>
                <div className="hidden sm:block">
                  <span className="text-5xl opacity-80">🏥</span>
                </div>
              </div>
              
              {message && (
                <div className="mx-10 mt-8 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 p-4 rounded-r-lg flex items-center gap-3 shadow-sm">
                  <span className="text-xl">✅</span> 
                  <span className="font-medium">{message}</span>
                </div>
              )}

              <form onSubmit={handleSubmitTicket} className="p-10 space-y-8">
                {/* Row 1: Tiêu đề */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Tiêu đề sự cố <span className="text-red-500">*</span></label>
                  <input type="text" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} placeholder="Ví dụ: Máy in phòng khám số 3 không hoạt động" className="w-full px-5 py-4 rounded-xl border border-gray-200 focus:ring-4 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-gray-800" required />
                </div>

                {/* Row 2: Danh mục & Mức độ */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                      <span>📁</span> Danh mục lỗi
                    </label>
                    <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-teal-500/20 focus:border-teal-500 bg-white transition-all text-gray-700">
                      <option value="Phần cứng">🖥️ Phần cứng (Máy tính, Máy in...)</option>
                      <option value="Phần mềm">💽 Phần mềm (HIS, LIS, PACS...)</option>
                      <option value="Mạng">🌐 Mạng & Internet</option>
                      <option value="Tài khoản">🔑 Tài khoản & Mật khẩu</option>
                      <option value="Khác">🔧 Khác...</option>
                    </select>
                    {formData.category === "Khác" && ( <input type="text" value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} placeholder="Nhập tên danh mục lỗi..." className="w-full mt-4 px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-teal-500/20 focus:border-teal-500 transition-all" required /> )}
                  </div>

                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                      <span>⚠️</span> Mức độ ảnh hưởng
                    </label>
                    <select 
                      value={formData.priority} 
                      onChange={(e) => setFormData({...formData, priority: e.target.value})} 
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-teal-500/20 focus:border-teal-500 bg-white transition-all text-gray-700"
                    >
                      <option value="Emergency">🔴 Khẩn cấp (Đình trệ khám chữa bệnh, xử lý ngay)</option>
                      <option value="High">🟠 Ưu tiên cao (Gián đoạn công việc, không có giải pháp thay thế)</option>
                      <option value="Normal">🔵 Bình thường (Ảnh hưởng một phần, xử lý trong ca trực)</option>
                      <option value="Low">🟢 Ưu tiên thấp (Không gấp, có thể xử lý sau)</option>
                    </select>
                  </div>
                </div>

                {/* Row 3: Mô tả chi tiết */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Mô tả chi tiết <span className="text-red-500">*</span></label>
                  <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={5} placeholder="Vui lòng mô tả rõ tình trạng máy, các báo lỗi trên màn hình..." className="w-full px-5 py-4 rounded-xl border border-gray-200 focus:ring-4 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-gray-800" required></textarea>
                </div>

                {/* Row 4: Upload File */}
                <div className="bg-teal-50/50 p-6 rounded-2xl border border-teal-100 border-dashed">
                  <label className="block text-sm font-bold text-teal-800 mb-3 flex items-center gap-2">
                    <span>📸</span> Hình ảnh đính kèm (Tối đa 5 ảnh)
                  </label>
                  <input 
                    type="file" 
                    multiple 
                    accept="image/*" 
                    onChange={handleFileChange} 
                    className="block w-full text-sm text-gray-600 file:mr-5 file:py-3 file:px-5 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-teal-100 file:text-teal-700 hover:file:bg-teal-200 transition-all cursor-pointer" 
                  />
                  {selectedFiles.length > 0 && (
                    <div className="mt-4 flex gap-3 flex-wrap">
                      {selectedFiles.map((file, idx) => (
                        <span key={idx} className="bg-white border border-teal-200 text-teal-700 px-3 py-1.5 rounded-lg text-sm font-medium shadow-sm flex items-center gap-1">
                          📎 {file.name.substring(0, 15)}{file.name.length > 15 ? '...' : ''}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-6 flex justify-end gap-4">
                  <button type="button" onClick={() => setActiveTab("my-tickets")} className="px-8 py-3.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all">
                    Hủy Bỏ
                  </button>
                  <button type="submit" className="bg-gradient-to-r from-teal-500 to-emerald-600 text-white px-10 py-3.5 rounded-xl font-bold shadow-lg shadow-teal-500/30 hover:shadow-teal-500/50 hover:scale-[1.02] transition-all flex items-center gap-2">
                    <span>Gửi Yêu Cầu</span> <span>&rarr;</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        <ChatbotWidget onFallbackToTicket={handleAiFallback} />
      </main>
    </div>
  );
}