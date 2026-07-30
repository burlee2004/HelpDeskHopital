"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ITWorkspace() {
  const router = useRouter();
  // Đã xóa mockTickets, khởi tạo state rỗng để đón dữ liệu thật
  const [tickets, setTickets] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("kanban");
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // State quản lý xem chi tiết Ticket
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [chatMessage, setChatMessage] = useState("");
  // State cho Chat Nội Bộ (Sidebar)
  const [internalChatUser, setInternalChatUser] = useState<any>(null);
  const [internalMessages, setInternalMessages] = useState<any[]>([]);
  const [internalChatInput, setInternalChatInput] = useState("");
  const [internalChatFiles, setInternalChatFiles] = useState<File[]>([]);
  const [selectedTicketToAttach, setSelectedTicketToAttach] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [reportFiles, setReportFiles] = useState<File[]>([]);
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [itUsers, setItUsers] = useState<any[]>([]);
  const [selectedAssignee, setSelectedAssignee] = useState("");

  const getToken = () => localStorage.getItem("token");

  const fetchTickets = async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch("http://127.0.0.1:8000/tickets/", { headers: { Authorization: `Bearer ${token}` }});
      if (res.ok) setTickets(await res.json());
    } catch (error) { console.error(error); }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      const token = getToken();
      if (!token) { router.push("/login"); return; }
      try {
        const res = await fetch("http://127.0.0.1:8000/users/me", { headers: { Authorization: `Bearer ${token}` }});
        if (res.ok) {
          setCurrentUser(await res.json());
          fetchTickets();
        } else { router.push("/login"); }
      } catch (error) { console.error(error); }
    };
    fetchProfile();
  }, [router]);

  const handleLogout = async () => {
    const token = getToken();
    if (token) {
      try { await fetch("http://127.0.0.1:8000/logout", { method: "POST", headers: { Authorization: `Bearer ${token}` } }); } 
      catch (error) {}
    }
    localStorage.removeItem("token");
    router.push("/login");
  };

  const moveTicket = async (id: number, newStatus: string) => {
    const token = getToken();
    try {
      const res = await fetch(`http://127.0.0.1:8000/tickets/${id}/status?status=${newStatus}`, {
        method: "PUT", headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setTickets(tickets.map(ticket => ticket.id === id ? { ...ticket, status: newStatus } : ticket));
        if (selectedTicket && selectedTicket.id === id) {
          setSelectedTicket({ ...selectedTicket, status: newStatus });
        }
      } else alert("Có lỗi xảy ra khi cập nhật!");
    } catch (error) { console.error(error); }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    try {
      const formData = new FormData();
      formData.append("message", chatMessage);
      formData.append("is_internal", "false");

      const res = await fetch(`http://127.0.0.1:8000/tickets/${selectedTicket.id}/comments`, {
        method: "POST", headers: { Authorization: `Bearer ${getToken()}` }, body: formData
      });
      if (res.ok) {
        setChatMessage("");
        const newComment = await res.json();
        setSelectedTicket({ ...selectedTicket, comments: [...(selectedTicket.comments || []), newComment] });
      }
    } catch (error) { console.error(error); }
  };

  const fetchItUsers = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/users/it", { headers: { Authorization: `Bearer ${getToken()}` } });
      if (res.ok) setItUsers(await res.json());
    } catch (e) {}
  };

  const fetchInternalMessages = async (userId: number) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/internal-chat/messages/${userId}`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (res.ok) setInternalMessages(await res.json());
    } catch (e) {}
  };

  const handleSendInternalChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!internalChatInput.trim() && internalChatFiles.length === 0) return;
    try {
      const formData = new FormData();
      formData.append("receiver_id", String(internalChatUser.id));
      formData.append("message", internalChatInput);
      if (selectedTicketToAttach) formData.append("related_ticket_id", selectedTicketToAttach);
      internalChatFiles.forEach(file => formData.append("files", file));

      const res = await fetch(`http://127.0.0.1:8000/internal-chat/messages`, {
        method: "POST", headers: { Authorization: `Bearer ${getToken()}` }, body: formData
      });
      if (res.ok) {
        setInternalChatInput("");
        setInternalChatFiles([]);
        setSelectedTicketToAttach("");
        const newMsg = await res.json();
        setInternalMessages(prev => [...prev, newMsg]);
      }
    } catch (e) {}
  };

  const handleInternalPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      setInternalChatFiles(prev => [...prev, ...Array.from(e.clipboardData.files)]);
      e.preventDefault();
    }
  };

  const handleEscalate = async () => {
    if (!selectedAssignee) { alert("Vui lòng chọn nhân viên IT"); return; }
    try {
      const res = await fetch(`http://127.0.0.1:8000/tickets/${selectedTicket.id}/escalate?new_assignee_id=${selectedAssignee}`, {
        method: "PUT", headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.ok) {
        alert("Đã chuyển tiếp thành công!");
        setShowEscalateModal(false);
        setSelectedTicket(null);
        fetchTickets();
      }
    } catch (e) { console.error(e); }
  };



  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportDescription.trim() && reportFiles.length === 0) return;
    
    const formData = new FormData();
    formData.append("action", "Báo cáo tiến độ");
    formData.append("description", reportDescription);
    reportFiles.forEach(file => formData.append("files", file));

    try {
      const res = await fetch(`http://127.0.0.1:8000/tickets/${selectedTicket.id}/report`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData
      });
      if (res.ok) {
        alert("Gửi báo cáo thành công!");
        setReportDescription("");
        setReportFiles([]);
        fetchTickets();
        const newHistory = await res.json();
        setSelectedTicket({ ...selectedTicket, histories: [...(selectedTicket.histories || []), newHistory] });
      } else {
        alert("Lỗi khi gửi báo cáo.");
      }
    } catch (error) { console.error(error); }
  };

  const formatTime = (timeString: string) => new Date(timeString).toLocaleString('vi-VN');

  const KanbanColumn = ({ title, statusKey, bgColor }: { title: string, statusKey: string, bgColor: string }) => {
    const columnTickets = tickets.filter(t => t.status === statusKey);
    return (
      <div className={`flex flex-col rounded-lg ${bgColor} p-4 h-[calc(100vh-140px)]`}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-gray-700">{title}</h3>
          <span className="bg-white text-gray-600 text-xs font-bold px-2 py-1 rounded-full shadow-sm">{columnTickets.length}</span>
        </div>
        <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
          {columnTickets.map(ticket => (
            <div key={ticket.id} onClick={() => setSelectedTicket(ticket)} className="bg-white p-4 rounded-lg shadow-sm border-l-4 hover:shadow-md transition cursor-pointer group" style={{ borderLeftColor: ticket.priority === 'Cần gấp' ? '#ef4444' : '#22c55e' }}>
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-semibold text-gray-500">#{ticket.id}</span>
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${ticket.priority === 'Cần gấp' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                  {ticket.priority}
                </span>
              </div>
              <h4 className="text-sm font-semibold text-gray-800 mb-2 leading-tight">{ticket.title}</h4>
              <div className="flex justify-between items-center mt-3">
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{ticket.category}</span>
                <span className="text-[10px] text-gray-400">{formatTime(ticket.created_at)}</span>
              </div>
            </div>
          ))}
          {columnTickets.length === 0 && <div className="h-24 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg text-gray-400 text-sm">Trống</div>}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900 overflow-hidden">
      <aside className="w-20 lg:w-64 bg-slate-900 text-white flex flex-col shadow-xl z-20 transition-all duration-300">
        <div className="h-16 flex items-center justify-center border-b border-slate-800"><h1 className="text-xl font-bold tracking-wider text-blue-400">IT HELPDESK</h1></div>
        <nav className="flex-1 py-6">
          <ul className="space-y-2 px-4">
            <li><button onClick={() => {setActiveTab("kanban"); setSelectedTicket(null); fetchTickets();}} className={`w-full flex items-center px-4 py-3 rounded-lg ${activeTab === "kanban" && !selectedTicket ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-800"}`}><span className="text-xl">📋</span><span className="ml-3 font-medium">Bảng Kanban</span></button></li>
            <li><button onClick={() => setActiveTab("list")} className={`w-full flex items-center px-4 py-3 rounded-lg ${activeTab === "list" ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}><span className="text-xl">📑</span><span className="ml-3 font-medium">Danh sách Ticket</span></button></li>
            <li><button onClick={() => {setActiveTab("internal_chat"); setSelectedTicket(null); fetchItUsers();}} className={`w-full flex items-center px-4 py-3 rounded-lg ${activeTab === "internal_chat" ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}><span className="text-xl">💬</span><span className="ml-3 font-medium">Chat Nội Bộ</span></button></li>
          </ul>
        </nav>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="h-16 bg-white shadow-sm flex items-center justify-between px-8 z-10 border-b">
          <h2 className="text-xl font-bold text-gray-800">Không Gian Làm Việc IT</h2>
          <div className="flex items-center space-x-4">
            <div className="flex flex-col text-right"><span className="text-sm font-semibold text-gray-700">{currentUser ? currentUser.full_name : "Đang tải..."}</span><span className="text-xs text-green-500 font-medium mt-1">Đang trực tuyến</span></div>
            <button onClick={handleLogout} className="text-gray-500 hover:text-red-600 transition">Đăng xuất</button>
          </div>
        </header>

        <main className="flex-1 p-6 bg-slate-50 overflow-x-hidden overflow-y-auto">
          
          {/* MÀN HÌNH KANBAN (Ẩn đi nếu đang chọn xem 1 Ticket cụ thể) */}
          {activeTab === "kanban" && !selectedTicket && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 h-full">
              <KanbanColumn title="Được giao (Open)" statusKey="Open" bgColor="bg-gray-200/60" />
              <KanbanColumn title="Đang Xử Lý (In Progress)" statusKey="In Progress" bgColor="bg-blue-50/80" />
              <KanbanColumn title="Chờ Phản Hồi (Pending)" statusKey="Pending" bgColor="bg-orange-50/80" />
              <KanbanColumn title="Hoàn Thành (Resolved)" statusKey="Resolved" bgColor="bg-green-50/80" />
            </div>
          )}

          {/* ========================================================= */}
          {/* MÀN HÌNH XEM CHI TIẾT TICKET (Đoạn bạn bị thiếu ở return) */}
          {/* ========================================================= */}
          {selectedTicket && (
            <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in-up">
              
              {/* Header của Ticket Detail */}
              <div className="px-6 py-4 border-b bg-gray-50/50 flex justify-between items-center">
                <h3 className="text-lg font-semibold">Chi tiết Ticket #{selectedTicket.id}</h3>
                <button onClick={() => {setSelectedTicket(null); fetchTickets();}} className="text-blue-600 font-medium hover:underline text-sm">
                  &larr; Quay lại
                </button>
              </div>

              <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-2 text-gray-900">{selectedTicket.title}</h2>
                    <div className="flex gap-3 items-center">
                      <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-semibold">{selectedTicket.category}</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${selectedTicket.priority === 'Cần gấp' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {selectedTicket.priority}
                      </span>
                      <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold">
                        Trạng thái: {selectedTicket.status}
                      </span>
                    </div>
                  </div>

                  {/* BỘ NÚT CHUYỂN TRẠNG THÁI CHO IT */}
                  <div className="flex flex-col gap-2">
                    {selectedTicket.status === 'Open' && <button onClick={() => moveTicket(selectedTicket.id, "In Progress")} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium shadow hover:bg-blue-700">Nhận xử lý</button>}
                    {selectedTicket.status === 'In Progress' && (
                      <div className="flex gap-2">
                        <button onClick={() => moveTicket(selectedTicket.id, "Pending")} className="bg-orange-500 text-white px-4 py-2 rounded-lg font-medium shadow hover:bg-orange-600">Chờ phản hồi</button>
                        <button onClick={() => moveTicket(selectedTicket.id, "Resolved")} className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium shadow hover:bg-green-700">Hoàn Thành (Resolved)</button>
                      </div>
                    )}
                    {selectedTicket.status === 'Pending' && <button onClick={() => moveTicket(selectedTicket.id, "In Progress")} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium shadow hover:bg-blue-700">Tiếp tục xử lý</button>}
                    {(selectedTicket.status === 'Open' || selectedTicket.status === 'In Progress' || selectedTicket.status === 'Pending') && (
                      <button onClick={() => { fetchItUsers(); setShowEscalateModal(true); }} className="bg-purple-600 text-white px-4 py-2 rounded-lg font-medium shadow hover:bg-purple-700 mt-2 flex items-center justify-center gap-2">
                        <span className="text-lg">🔁</span> Chuyển tiếp (Escalate)
                      </button>
                    )}
                  </div>
                </div>

                {/* Mô tả lỗi */}
                <div className="bg-slate-50 p-5 rounded-lg border border-slate-200 mb-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Mô tả lỗi:</h4>
                  <p className="whitespace-pre-wrap text-gray-800">{selectedTicket.description}</p>
                </div>

                {/* DANH SÁCH NHIỆM VỤ PHỤ (SUB-TASKS) */}
                {selectedTicket.tasks && selectedTicket.tasks.length > 0 && (
                  <div className="bg-yellow-50 p-5 rounded-lg border border-yellow-200 mb-6">
                    <h4 className="font-bold text-yellow-800 mb-3">✅ Danh sách Nhiệm vụ (Checklist)</h4>
                    <div className="space-y-2">
                      {selectedTicket.tasks.map((task: any) => (
                        <div key={task.id} className="flex items-center gap-3 p-3 bg-white rounded border shadow-sm">
                          <input 
                            type="checkbox" 
                            checked={task.is_completed}
                            disabled={currentUser?.id !== task.assignee_id && currentUser?.role !== 'IT-Manager'}
                            onChange={async (e) => {
                              const checked = e.target.checked;
                              try {
                                const res = await fetch(`http://127.0.0.1:8000/tickets/tasks/${task.id}?is_completed=${checked}`, {
                                  method: "PUT", headers: { Authorization: `Bearer ${getToken()}` }
                                });
                                if(res.ok) {
                                  // Update local state
                                  const newTasks = selectedTicket.tasks.map((t: any) => t.id === task.id ? {...t, is_completed: checked} : t);
                                  setSelectedTicket({...selectedTicket, tasks: newTasks});
                                } else {
                                  alert("Bạn không có quyền hoặc có lỗi xảy ra");
                                }
                              } catch(err) { console.error(err); }
                            }}
                            className="w-5 h-5 cursor-pointer accent-blue-600"
                          />
                          <div className="flex-1">
                            <p className={`font-semibold text-sm ${task.is_completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                              {task.task_description}
                            </p>
                            <p className="text-xs text-gray-500">Phụ trách: {task.assignee?.full_name}</p>
                          </div>
                          {task.is_completed && <span className="text-green-600 text-xs font-bold border border-green-200 bg-green-50 px-2 py-1 rounded">Hoàn thành</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hình ảnh đính kèm (nếu có) */}
                {selectedTicket.image_urls && (
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Hình ảnh đính kèm:</h4>
                    <div className="flex gap-4 flex-wrap">
                      {selectedTicket.image_urls.split(',').map((url: string, idx: number) => (
                        <img key={idx} src={`http://127.0.0.1:8000${url}`} className="h-40 object-cover rounded-lg border shadow-sm" alt="Error"/>
                      ))}
                    </div>
                  </div>
                )}

                {/* FORM BÁO CÁO TIẾN ĐỘ CHO IT */}
                {selectedTicket.status === 'In Progress' && (
                  <div className="bg-blue-50 p-6 rounded-xl border border-blue-200 mb-6">
                    <h3 className="font-bold text-blue-900 mb-3">📍 Báo cáo tiến độ xử lý</h3>
                    <form onSubmit={handleReportSubmit} className="space-y-4">
                      <div>
                        <textarea
                          value={reportDescription}
                          onChange={(e) => setReportDescription(e.target.value)}
                          placeholder="Mô tả công việc đã thực hiện..."
                          className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-blue-500"
                          rows={3}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-2">Đính kèm File (Ảnh/Video)</label>
                        <input
                          type="file"
                          multiple
                          accept="image/*,video/*"
                          onChange={(e) => {
                            if (e.target.files) {
                                setReportFiles(Array.from(e.target.files));
                            }
                          }}
                          className="w-full px-4 py-2 rounded-lg border bg-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        {reportFiles.length > 0 && (
                          <div className="mt-2 flex gap-2 flex-wrap">
                            {reportFiles.map((file, idx) => (
                              <span key={idx} className="bg-white border px-3 py-1 rounded-md text-sm text-gray-600 truncate max-w-[150px]">
                                {file.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition">
                          Gửi Báo Cáo
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* XEM FEEDBACK CỦA USER (Chỉ hiện khi User đã đánh giá và đóng) */}
                {selectedTicket.status === 'Closed' && selectedTicket.feedback && (
                  <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-xl mb-6">
                    <h3 className="font-bold text-yellow-800 mb-2">⭐ Đánh giá từ người dùng</h3>
                    <p className="text-xl text-yellow-500 mb-2">{'★'.repeat(selectedTicket.feedback.rating)}{'☆'.repeat(5-selectedTicket.feedback.rating)}</p>
                    <p className="italic text-gray-700">"{selectedTicket.feedback.comment}"</p>
                  </div>
                )}

                {/* KHU VỰC CHAT TRỰC TIẾP GIỮA IT VÀ USER */}
                <div className="border-t border-gray-200 pt-6 mt-6">
                  <h3 className="font-bold text-lg text-gray-800 mb-4">💬 Trao đổi với User</h3>
                  
                  <div className="bg-gray-100 p-4 rounded-lg h-64 overflow-y-auto mb-4 flex flex-col gap-3 border border-gray-200">
                    {(() => {
                      const visibleComments = selectedTicket.comments?.filter((c: any) => !c.is_internal) || [];
                      if (visibleComments.length === 0) return <p className="text-center text-gray-400 mt-10">Chưa có tin nhắn nào.</p>;
                      return visibleComments.map((c: any) => (
                        <div key={c.id} className={`p-3 rounded-lg max-w-[80%] ${c.user.role === 'IT-Supporter' || c.user.role === 'IT-Manager' ? 'bg-blue-100 text-blue-900 self-end' : 'bg-white border border-gray-200 self-start'}`}>
                          <div className="text-xs font-bold mb-1 opacity-70">
                            {c.user.full_name} ({c.user.role}) • {formatTime(c.created_at)}
                          </div>
                          <p className="text-sm">{c.message}</p>
                        </div>
                      ));
                    })()}
                  </div>

                  <form onSubmit={handleSendChat} className="flex gap-2">
                    <input 
                      type="text" 
                      value={chatMessage} 
                      onChange={e => setChatMessage(e.target.value)} 
                      placeholder="Nhập tin nhắn hỗ trợ User..."
                      className="flex-1 border border-gray-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500" 
                    />
                    <button type="submit" className="text-white px-6 py-2 rounded-lg font-bold transition bg-blue-600 hover:bg-blue-700">Gửi</button>
                  </form>
                </div>

              </div>
            </div>
          )}
          {/* ========================================================= */}

          {activeTab === "list" && !selectedTicket && (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-xl font-bold text-gray-800 mb-6">Danh sách tất cả sự cố (Tickets)</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 border-b-2 border-slate-200 text-slate-600">
                    <tr>
                      <th className="px-4 py-3 font-semibold">ID</th>
                      <th className="px-4 py-3 font-semibold">Tiêu đề</th>
                      <th className="px-4 py-3 font-semibold">Phân loại</th>
                      <th className="px-4 py-3 font-semibold">Độ ưu tiên</th>
                      <th className="px-4 py-3 font-semibold">Trạng thái</th>
                      <th className="px-4 py-3 font-semibold">Đánh giá</th>
                      <th className="px-4 py-3 font-semibold">Ngày tạo</th>
                      <th className="px-4 py-3 font-semibold text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((t) => (
                      <tr key={t.id} className="border-b hover:bg-slate-50 transition">
                        <td className="px-4 py-4 text-slate-500 font-medium">#{t.id}</td>
                        <td className="px-4 py-4 font-bold text-slate-800">{t.title}</td>
                        <td className="px-4 py-4 text-slate-500"><span className="bg-gray-100 px-2 py-1 rounded">{t.category}</span></td>
                        <td className="px-4 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${t.priority === 'Cần gấp' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            {t.priority}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-bold border ${t.status === 'Open' ? 'bg-red-50 text-red-600 border-red-200' : t.status === 'In Progress' ? 'bg-blue-50 text-blue-600 border-blue-200' : t.status === 'Pending' ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-green-50 text-green-600 border-green-200'}`}>
                            {t.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-yellow-500 text-sm">
                          {t.feedback ? (
                            <span title={t.feedback.comment}>{'★'.repeat(t.feedback.rating)}{'☆'.repeat(5-t.feedback.rating)}</span>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-slate-500 text-xs">{formatTime(t.created_at)}</td>
                        <td className="px-4 py-4 text-center">
                          <button onClick={() => setSelectedTicket(t)} className="text-blue-600 hover:text-blue-800 font-semibold bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded transition">Xem chi tiết</button>
                        </td>
                      </tr>
                    ))}
                    {tickets.length === 0 && (
                      <tr><td colSpan={8} className="text-center py-8 text-slate-500">Chưa có yêu cầu nào được phân công.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "internal_chat" && (
            <div className="flex bg-white rounded-xl shadow-sm border border-gray-200 h-[calc(100vh-140px)] overflow-hidden">
              <div className="w-1/3 border-r flex flex-col bg-gray-50">
                <div className="p-4 border-b font-bold text-gray-700 bg-white shadow-sm z-10">Danh sách nhân sự</div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {itUsers.filter(u => u.id !== currentUser?.id).map(u => (
                    <div key={u.id} onClick={() => { setInternalChatUser(u); fetchInternalMessages(u.id); }} className={`p-3 rounded-lg cursor-pointer transition ${internalChatUser?.id === u.id ? 'bg-blue-100 border border-blue-200' : 'bg-white border border-gray-100 hover:bg-gray-100'}`}>
                      <div className="font-semibold text-gray-800 text-sm">{u.full_name}</div>
                      <div className="text-xs text-gray-500">{u.role}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="w-2/3 flex flex-col bg-white">
                {internalChatUser ? (
                  <>
                    <div className="p-4 border-b font-bold text-gray-800 bg-white shadow-sm flex items-center justify-between z-10">
                      <span>Đang chat với: <span className="text-blue-600">{internalChatUser.full_name}</span></span>
                    </div>
                    <div className="flex-1 p-4 overflow-y-auto bg-gray-50 flex flex-col gap-3">
                      {internalMessages.length === 0 && <div className="text-center text-gray-400 mt-10">Chưa có tin nhắn nào. Bắt đầu trao đổi!</div>}
                      {internalMessages.map(msg => (
                        <div key={msg.id} className={`p-3 rounded-xl max-w-[80%] ${msg.sender_id === currentUser?.id ? 'bg-blue-600 text-white self-end shadow-md' : 'bg-white border text-gray-800 self-start shadow-sm'}`}>
                          <div className="text-[10px] opacity-70 mb-1">{formatTime(msg.created_at)}</div>
                          <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                          {msg.related_ticket_id && (
                            <div className="mt-2 p-2 rounded bg-white/20 border border-white/30 text-xs">
                              <span className="font-bold">📎 Đính kèm Ticket #{msg.related_ticket_id}</span>
                            </div>
                          )}
                          {msg.attachment_urls && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {msg.attachment_urls.split(',').map((url: string, idx: number) => (
                                <img key={idx} src={`http://127.0.0.1:8000${url}`} alt="Đính kèm" className="h-24 rounded border object-cover cursor-pointer hover:opacity-80" onClick={() => window.open(`http://127.0.0.1:8000${url}`, '_blank')} />
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="p-4 border-t bg-white">
                      <form onSubmit={handleSendInternalChat} className="flex flex-col gap-2">
                        <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-200">
                          <label className="text-xs font-bold text-gray-600 px-3 py-1.5 rounded cursor-pointer hover:bg-gray-200 transition flex items-center gap-1 border border-gray-300 bg-white">
                            📎 Tải Ảnh/Video
                            <input type="file" multiple accept="image/*,video/*" className="hidden" onChange={(e) => {
                              if (e.target.files) setInternalChatFiles(Array.from(e.target.files));
                            }} />
                          </label>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">Đính kèm Ticket:</span>
                            <select value={selectedTicketToAttach} onChange={e => setSelectedTicketToAttach(e.target.value)} className="text-xs border rounded p-1 outline-none">
                              <option value="">Không đính kèm</option>
                              {tickets.map(t => <option key={t.id} value={t.id}>#{t.id} - {t.title}</option>)}
                            </select>
                          </div>
                        </div>
                        {internalChatFiles.length > 0 && <div className="text-xs text-blue-600 font-medium px-2">{internalChatFiles.length} file đã chọn</div>}
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            value={internalChatInput} 
                            onChange={e => setInternalChatInput(e.target.value)} 
                            onPaste={handleInternalPaste}
                            placeholder="Nhập tin nhắn (Ctrl+V để dán ảnh)..."
                            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50" 
                          />
                          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold transition shadow-sm">Gửi</button>
                        </div>
                      </form>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <span className="text-5xl block mb-4">💬</span>
                      Chọn một người bên trái để bắt đầu chat
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MODAL CHUYỂN TIẾP TICKET */}
      {showEscalateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl w-96 animate-fade-in-up">
            <h3 className="text-xl font-bold mb-4">Chuyển tiếp sự cố</h3>
            <p className="text-sm text-gray-600 mb-4">Chọn IT bạn muốn nhường việc xử lý sự cố này:</p>
            <select value={selectedAssignee} onChange={(e) => setSelectedAssignee(e.target.value)} className="w-full border p-2 rounded-lg mb-4 outline-none focus:ring-2 focus:ring-purple-500">
              <option value="">-- Chọn nhân viên IT --</option>
              {itUsers.filter(u => u.id !== currentUser?.id).map(u => (
                <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>
              ))}
            </select>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowEscalateModal(false)} className="px-4 py-2 bg-gray-200 rounded-lg font-medium hover:bg-gray-300">Hủy</button>
              <button onClick={handleEscalate} className="px-4 py-2 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700">Xác nhận chuyển</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}