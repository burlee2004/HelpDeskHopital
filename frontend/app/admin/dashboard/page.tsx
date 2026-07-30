"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardOverview from "./DashboardOverview";
// --- COMPONENT: TRANG TRỐNG ---
const EmptyPage = ({ title }: { title: string }) => (
  <div className="flex items-center justify-center h-64 bg-white rounded-lg shadow border-dashed border-2 border-gray-300">
    <p className="text-gray-500 text-lg">Giao diện {title} đang được phát triển...</p>
  </div>
);

// --- COMPONENT: QUẢN LÝ PHÒNG BAN ---
const DepartmentManagement = () => {
  const [departments, setDepartments] = useState<any[]>([]);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  const fetchDepartments = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/departments/", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (res.ok) setDepartments(await res.json());
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchDepartments(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    const url = editingId ? `http://127.0.0.1:8000/departments/${editingId}` : "http://127.0.0.1:8000/departments/";
    const method = editingId ? "PUT" : "POST";
    
    try {
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setMessage(editingId ? "Cập nhật thành công!" : "Thêm mới thành công!");
        setFormData({ name: "", description: "" });
        setEditingId(null);
        fetchDepartments();
      } else {
        const error = await res.json();
        setMessage(`Lỗi: ${error.detail}`);
      }
    } catch (err) { setMessage("Lỗi kết nối"); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn xóa phòng ban này?")) return;
    try {
      const res = await fetch(`http://127.0.0.1:8000/departments/${id}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (res.ok) {
        fetchDepartments();
      } else {
        const err = await res.json();
        alert(err.detail);
      }
    } catch (err) { console.error(err); }
  };

  return (
    <div className="space-y-6">
      <div className={`bg-white p-6 rounded-lg shadow border-t-4 ${editingId ? 'border-yellow-500' : 'border-blue-600'}`}>
        <h2 className="text-xl font-semibold mb-4 text-gray-800">{editingId ? "Sửa Phòng Ban" : "Thêm Phòng Ban Mới"}</h2>
        {message && <div className={`p-3 mb-4 rounded ${message.includes("Lỗi") ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>{message}</div>}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="block text-sm text-gray-700 mb-1">Tên Khoa/Phòng</label><input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-2 border rounded" required placeholder="VD: Khoa Cấp Cứu" /></div>
          <div><label className="block text-sm text-gray-700 mb-1">Mô tả thêm</label><input type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full p-2 border rounded" placeholder="Ghi chú (Tùy chọn)" /></div>
          <div className="md:col-span-2 flex space-x-3"><button type="submit" className={`${editingId ? 'bg-yellow-500' : 'bg-blue-600'} text-white px-6 py-2 rounded shadow transition`}>{editingId ? "Lưu Thay Đổi" : "+ Thêm Mới"}</button>{editingId && <button type="button" onClick={() => {setEditingId(null); setFormData({ name: "", description: "" });}} className="bg-gray-300 text-gray-700 px-6 py-2 rounded">Hủy</button>}</div>
        </form>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Danh Sách Phòng Ban</h2>
        <table className="min-w-full text-left text-sm whitespace-nowrap"><thead className="bg-gray-50 border-b-2"><tr><th className="px-4 py-3">ID</th><th className="px-4 py-3">Tên Phòng Ban</th><th className="px-4 py-3">Mô tả</th><th className="px-4 py-3">Thao tác</th></tr></thead>
        <tbody>
          {departments.map((dept) => (
            <tr key={dept.id} className="border-b"><td className="px-4 py-3 font-semibold">#{dept.id}</td><td className="px-4 py-3 font-bold text-blue-700">{dept.name}</td><td className="px-4 py-3 text-gray-500">{dept.description}</td><td className="px-4 py-3"><button onClick={() => {setEditingId(dept.id); setFormData({name: dept.name, description: dept.description || ""});}} className="text-blue-600 mr-3 hover:underline">Sửa</button><button onClick={() => handleDelete(dept.id)} className="text-red-600 hover:underline">Xóa</button></td></tr>
          ))}
          {departments.length === 0 && <tr><td colSpan={4} className="text-center py-4 text-gray-500">Chưa có phòng ban nào.</td></tr>}
        </tbody></table>
      </div>
    </div>
  );
};

import AdminTicketManagement from "./AdminTicketManagement";

// --- MAIN PAGE COMPONENT ---


// --- COMPONENT: QUẢN LÝ TÀI KHOẢN ---
const UserManagement = () => {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [formData, setFormData] = useState({
    full_name: "", email: "", password: "", role: "IT-Supporter", department_id: "", room_number: ""
  });

  const fetchUsers = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch("http://127.0.0.1:8000/users/", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setUsers(await res.json());
      
      const resD = await fetch("http://127.0.0.1:8000/departments/", { headers: { Authorization: `Bearer ${token}` } });
      if (resD.ok) setDepartments(await resD.json());
    } catch (error) { console.error("Lỗi:", error); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    const token = localStorage.getItem("token");
    const url = editingId ? `http://127.0.0.1:8000/users/${editingId}` : "http://127.0.0.1:8000/users/";
    const method = editingId ? "PUT" : "POST";

    try {
      const payload = {
        ...formData,
        department_id: formData.role === "End-User" && formData.department_id ? parseInt(formData.department_id) : null,
        room_number: formData.role === "End-User" ? formData.room_number : null
      };

      const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Lỗi xử lý");
      setMessage(editingId ? "Cập nhật thành công!" : "Tạo tài khoản thành công!");
      setFormData({ full_name: "", email: "", password: "", role: "IT-Supporter", department_id: "", room_number: "" });
      setEditingId(null);
      fetchUsers();
    } catch (err: any) { setMessage(`Lỗi: ${err.message}`); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Xóa tài khoản này?")) return;
    try {
      const res = await fetch(`http://127.0.0.1:8000/users/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      if (res.ok) fetchUsers();
    } catch (error) { console.error(error); }
  };

  const handleEditClick = (user: any) => {
    setEditingId(user.id);
    setFormData({ full_name: user.full_name, email: user.email, password: "", role: user.role, department_id: user.department_id?.toString() || "", room_number: user.room_number || "" });
    setMessage("");
  };

  return (
    <div className="space-y-6">
      <div className={`bg-white p-6 rounded-lg shadow border-t-4 ${editingId ? 'border-yellow-500' : 'border-blue-600'}`}>
        <h2 className="text-xl font-semibold mb-4 text-gray-800">{editingId ? "Cập Nhật Tài Khoản" : "Cấp Tài Khoản Mới"}</h2>
        {message && <div className={`p-3 mb-4 rounded ${message.includes("Lỗi") ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>{message}</div>}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="block text-sm text-gray-700 mb-1">Họ và tên</label><input type="text" value={formData.full_name} onChange={(e) => setFormData({...formData, full_name: e.target.value})} className="w-full p-2 border rounded" required /></div>
          <div><label className="block text-sm text-gray-700 mb-1">Email</label><input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full p-2 border rounded" required /></div>
          <div><label className="block text-sm text-gray-700 mb-1">Mật khẩu</label><input type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full p-2 border rounded" required={!editingId} /></div>
          <div><label className="block text-sm text-gray-700 mb-1">Cấp Quyền</label><select value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} className="w-full p-2 border rounded"><option value="IT-Supporter">Nhân viên IT (IT-Supporter)</option><option value="End-User">Nhân viên Bệnh viện (End-User)</option><option value="IT-Manager">Quản trị viên (IT-Manager)</option></select></div>
          {formData.role === "End-User" && (
            <>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Phòng Ban / Khoa</label>
                <select value={formData.department_id} onChange={(e) => setFormData({...formData, department_id: e.target.value})} className="w-full p-2 border rounded" required>
                  <option value="" disabled>--- Chọn Phòng Ban ---</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Tên Phòng / Số Phòng</label>
                <input type="text" value={formData.room_number} onChange={(e) => setFormData({...formData, room_number: e.target.value})} className="w-full p-2 border rounded" placeholder="VD: H101" />
              </div>
            </>
          )}
          <div className="md:col-span-2 flex space-x-3"><button type="submit" className={`${editingId ? 'bg-yellow-500' : 'bg-blue-600'} text-white px-6 py-2 rounded shadow transition`}>{editingId ? "Cập Nhật" : "+ Tạo Tài Khoản"}</button>{editingId && <button type="button" onClick={() => {setEditingId(null); setFormData({ full_name: "", email: "", password: "", role: "IT-Supporter", department_id: "", room_number: "" });}} className="bg-gray-300 text-gray-700 px-6 py-2 rounded">Hủy</button>}</div>
        </form>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Danh Sách Tài Khoản</h2>
        <table className="min-w-full text-left text-sm whitespace-nowrap"><thead className="bg-gray-50 border-b-2"><tr><th className="px-4 py-3">Họ tên</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Quyền</th><th className="px-4 py-3">Phòng Ban - Vị trí</th><th className="px-4 py-3">Thao tác</th></tr></thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-b"><td className="px-4 py-3 font-semibold">{user.full_name}</td><td className="px-4 py-3 text-gray-600">{user.email}</td><td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-bold ${user.role === 'End-User' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{user.role}</span></td><td className="px-4 py-3 text-gray-600 font-medium">{user.department?.name || "-"}{user.room_number ? ` (${user.room_number})` : ""}</td><td className="px-4 py-3"><button onClick={() => handleEditClick(user)} className="text-blue-600 mr-3">Sửa</button><button onClick={() => handleDelete(user.id)} className="text-red-600">Xóa</button></td></tr>
          ))}
        </tbody></table>
      </div>
    </div>
  );
};

// --- COMPONENT: QUẢN LÝ ĐÁNH GIÁ ---
const FeedbackManagement = () => {
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const formatTime = (timeString: string) => new Date(timeString).toLocaleString('vi-VN');

  useEffect(() => {
    const fetchFeedbacks = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/feedbacks/", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        if (res.ok) setFeedbacks(await res.json());
      } catch (err) { console.error(err); }
    };
    fetchFeedbacks();
  }, []);

  return (
    <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
      <h2 className="text-xl font-bold mb-6 text-gray-800">Quản Lý Đánh Giá (Sentiment Analysis)</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-50 border-b-2 border-slate-200 text-slate-600">
            <tr>
              <th className="px-4 py-3 font-semibold">Ticket ID</th>
              <th className="px-4 py-3 font-semibold">Người đánh giá</th>
              <th className="px-4 py-3 font-semibold">Số sao</th>
              <th className="px-4 py-3 font-semibold">Bình luận</th>
              <th className="px-4 py-3 font-semibold">AI Phân tích</th>
              <th className="px-4 py-3 font-semibold">Ngày gửi</th>
            </tr>
          </thead>
          <tbody>
            {feedbacks.map((fb) => (
              <tr key={fb.id} className="border-b hover:bg-slate-50 transition">
                <td className="px-4 py-4 font-bold text-blue-600">#{fb.ticket_id}</td>
                <td className="px-4 py-4 text-slate-700 font-medium">{fb.ticket?.creator?.full_name || 'Khách'}</td>
                <td className="px-4 py-4 text-yellow-500 text-lg">{'★'.repeat(fb.rating)}{'☆'.repeat(5-fb.rating)}</td>
                <td className="px-4 py-4 text-slate-600 max-w-xs truncate" title={fb.comment}>{fb.comment}</td>
                <td className="px-4 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${fb.sentiment === 'Tiêu cực' ? 'bg-red-100 text-red-700 border-red-300 shadow-sm' : fb.sentiment === 'Tích cực' ? 'bg-green-100 text-green-700 border-green-300 shadow-sm' : 'bg-gray-100 text-gray-700 border-gray-300'}`}>
                    {fb.sentiment || 'Chưa phân tích'}
                  </span>
                </td>
                <td className="px-4 py-4 text-slate-400 text-xs">{formatTime(fb.created_at)}</td>
              </tr>
            ))}
            {feedbacks.length === 0 && (
              <tr><td colSpan={6} className="text-center py-8 text-slate-500">Chưa có đánh giá nào trên hệ thống.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- COMPONENT CHÍNH: ADMIN DASHBOARD ---
export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("users");
  const [currentUser, setCurrentUser] = useState<any>(null);

  // State cho Chat Nội Bộ (Sidebar)
  const [itUsers, setItUsers] = useState<any[]>([]);
  const [internalChatUser, setInternalChatUser] = useState<any>(null);
  const [internalMessages, setInternalMessages] = useState<any[]>([]);
  const [internalChatInput, setInternalChatInput] = useState("");
  const [internalChatFiles, setInternalChatFiles] = useState<File[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicketToAttach, setSelectedTicketToAttach] = useState("");

  const formatTime = (timeString: string) => new Date(timeString).toLocaleString('vi-VN');
  const getToken = () => localStorage.getItem("token");

  const fetchItUsers = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/users/it", { headers: { Authorization: `Bearer ${getToken()}` } });
      if (res.ok) setItUsers(await res.json());
      const resT = await fetch("http://127.0.0.1:8000/tickets/", { headers: { Authorization: `Bearer ${getToken()}` } });
      if (resT.ok) setTickets(await resT.json());
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

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem("token");
      if (!token) { router.push("/login"); return; }
      try {
        const res = await fetch("http://127.0.0.1:8000/users/me", { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setCurrentUser(await res.json());
        else { localStorage.removeItem("token"); router.push("/login"); }
      } catch (error) { console.error(error); }
    };
    fetchProfile();
  }, [router]);

 // Hàm đăng xuất mới: Có gọi API báo Offline
  const handleLogout = async () => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        // Gửi yêu cầu báo Offline xuống Backend
        await fetch("http://127.0.0.1:8000/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (error) {
        console.error("Lỗi khi đăng xuất:", error);
      }
    }
    
    // Xóa token ở máy và đẩy về trang đăng nhập
    localStorage.removeItem("token");
    router.push("/login");
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans text-gray-900">
      <aside className="w-64 bg-gray-900 text-white flex flex-col shadow-xl z-20">
        <div className="h-16 flex items-center justify-center border-b border-gray-800">
          <h1 className="text-xl font-bold tracking-wider text-blue-400">IT HELPDESK</h1>
        </div>
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1">
            <li><button onClick={() => setActiveTab("dashboard")} className={`w-full text-left px-6 py-3 transition-colors ${activeTab === "dashboard" ? "bg-blue-600" : "hover:bg-gray-800"}`}>📊 Tổng Quan</button></li>
            <li><button onClick={() => setActiveTab("tickets")} className={`w-full text-left px-6 py-3 transition-colors ${activeTab === "tickets" ? "bg-blue-600" : "hover:bg-gray-800"}`}>🎫 Quản Lý Ticket</button></li>
            <li><button onClick={() => setActiveTab("departments")} className={`w-full text-left px-6 py-3 transition-colors ${activeTab === "departments" ? "bg-blue-600" : "hover:bg-gray-800"}`}>🏢 Quản Lý Phòng Ban</button></li>
            <li><button onClick={() => setActiveTab("users")} className={`w-full text-left px-6 py-3 transition-colors ${activeTab === "users" ? "bg-blue-600" : "hover:bg-gray-800"}`}>👥 Quản Lý Tài Khoản</button></li>
            <li><button onClick={() => setActiveTab("feedbacks")} className={`w-full text-left px-6 py-3 transition-colors ${activeTab === "feedbacks" ? "bg-blue-600" : "hover:bg-gray-800"}`}>⭐ Quản Lý Đánh Giá</button></li>
            <li><button onClick={() => {setActiveTab("internal_chat"); fetchItUsers();}} className={`w-full text-left px-6 py-3 transition-colors ${activeTab === "internal_chat" ? "bg-blue-600" : "hover:bg-gray-800"}`}>💬 Chat Nội Bộ</button></li>
          </ul>
        </nav>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white shadow-sm flex items-center justify-between px-6 z-10">
          <h2 className="text-xl font-semibold text-gray-800 capitalize">
            {activeTab === "users" ? "Quản Lý Tài Khoản" : activeTab === "dashboard" ? "Tổng Quan" : `Quản Lý ${activeTab}`}
          </h2>
          <div className="flex items-center space-x-4">
            <div className="flex flex-col text-right">
                <span className="text-sm font-semibold text-gray-800 leading-tight">
                  {currentUser ? currentUser.full_name : "Đang tải..."}
                </span>
                <span className="text-xs font-medium text-gray-500">
                  {currentUser && currentUser.role === 'IT-Manager' ? 'Admin Cấp Cao' : 'Quản Trị Viên'}
                </span>
            </div>
            <button onClick={handleLogout} className="ml-2 bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded text-sm hover:bg-red-500 hover:text-white transition">Đăng Xuất</button>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">
          {activeTab === "users" && <UserManagement />}
          
          {/* ĐÃ SỬA: Thay EmptyPage bằng Component mới import */}
          {activeTab === "dashboard" && <DashboardOverview />} 
          
          {/* ĐÂY LÀ CHỖ GỌI COMPONENT TICKET MANAGEMENT */}
          {activeTab === "tickets" && <AdminTicketManagement />}
          {activeTab === "departments" && <DepartmentManagement />}

          {activeTab === "feedbacks" && <FeedbackManagement />}

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
    </div>
  );
}