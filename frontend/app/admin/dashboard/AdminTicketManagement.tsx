import { useState, useEffect } from "react";

export default function AdminTicketManagement() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [onlineITs, setOnlineITs] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  
  // States cho việc đánh giá & chia việc
  const [evalModalOpen, setEvalModalOpen] = useState(false);
  const [assignMode, setAssignMode] = useState<'auto' | 'manual'>('manual');
  const [evalData, setEvalData] = useState({ category: "", priority: "", severity: "Bình thường", admin_notes: "" });
  const [taskData, setTaskData] = useState({ assignee_id: "", task_description: "" });

  const fetchTicketsAndIT = async () => {
    const token = localStorage.getItem("token");
    try {
      const [resTickets, resIT] = await Promise.all([
        fetch("http://127.0.0.1:8000/tickets/", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("http://127.0.0.1:8000/users/it-online", { headers: { Authorization: `Bearer ${token}` } })
      ]);
      if (resTickets.ok) setTickets(await resTickets.json());
      if (resIT.ok) setOnlineITs(await resIT.json());
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchTicketsAndIT(); }, []);

  const handleOpenEval = (ticket: any, mode: 'auto' | 'manual') => {
    setSelectedTicket(ticket);
    setAssignMode(mode);
    setEvalData({
      category: ticket.category, priority: ticket.priority, severity: ticket.severity || "Bình thường", admin_notes: ticket.admin_notes || ""
    });
    setEvalModalOpen(true);
  };

  const handleSaveAll = async () => {
    if(!selectedTicket) return;
    try {
      const res = await fetch(`http://127.0.0.1:8000/tickets/${selectedTicket.id}/evaluate`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify(evalData)
      });
      if(!res.ok) { alert("Lỗi lưu đánh giá!"); return; }
      
      if (assignMode === 'auto') {
         const assignRes = await fetch(`http://127.0.0.1:8000/tickets/${selectedTicket.id}/auto-assign`, {
           method: "POST", headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
         });
         if(assignRes.ok) {
           const data = await assignRes.json();
           alert("Đã đánh giá & " + data.message);
         } else {
           const err = await assignRes.json();
           alert("Đã đánh giá, nhưng lỗi tự động gán: " + err.detail);
         }
      } else {
         alert("Đã lưu đánh giá & các phân công thủ công!");
      }
      fetchTicketsAndIT();
      setEvalModalOpen(false);
    } catch (err) { console.error(err); }
  };

  const handleAssignPrimary = async (itId: number) => {
    if(!itId || !selectedTicket) return;
    try {
      const res = await fetch(`http://127.0.0.1:8000/tickets/${selectedTicket.id}/assign?it_id=${itId}`, {
        method: "PUT", headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (res.ok) {
        alert("Đã phân công chính thành công!");
        fetchTicketsAndIT();
      }
    } catch (err) { console.error(err); }
  };

  const handleAddTask = async () => {
    if(!selectedTicket || !taskData.assignee_id || !taskData.task_description) return;
    try {
      const res = await fetch(`http://127.0.0.1:8000/tickets/${selectedTicket.id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({
          assignee_id: parseInt(taskData.assignee_id),
          task_description: taskData.task_description
        })
      });
      if(res.ok) {
        alert("Đã giao nhiệm vụ thành công!");
        setTaskData({ assignee_id: "", task_description: "" });
        fetchTicketsAndIT();
      }
    } catch (err) { console.error(err); }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Điều Phối Yêu Cầu Hỗ Trợ</h2>
        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold">
          {onlineITs.length} IT đang Online 🟢
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-gray-50 border-b-2 border-gray-200 text-gray-600">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Tiêu đề</th>
              <th className="px-4 py-3">Nghiêm trọng</th>
              <th className="px-4 py-3">Phụ trách / Nhiệm vụ</th>
              <th className="px-4 py-3">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => (
              <tr key={t.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-500">#{t.id}</td>
                <td className="px-4 py-3 font-semibold text-gray-800">{t.title}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${t.severity === 'Nghiêm trọng' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                    {t.severity || "Bình thường"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {t.assignee && (
                    <div className="text-green-600 font-medium text-xs mb-1">
                      ⭐ Phụ trách chính: {t.assignee.full_name}
                    </div>
                  )}
                  {t.tasks && t.tasks.map((task: any) => (
                    <div key={task.id} className="text-gray-600 text-xs flex items-center mb-1">
                      <span className={`w-2 h-2 rounded-full mr-2 ${task.is_completed ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                      {task.assignee?.full_name}: {task.task_description}
                    </div>
                  ))}
                  {!t.assignee && (!t.tasks || t.tasks.length === 0) && (
                    <span className="text-gray-400 italic text-xs">Chưa phân công</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-2">
                    <button onClick={() => handleOpenEval(t, 'auto')} className="bg-purple-600 text-white px-3 py-1 rounded text-xs hover:bg-purple-700 shadow">
                      Điều phối Tự động
                    </button>
                    <button onClick={() => handleOpenEval(t, 'manual')} className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 shadow">
                      Điều phối Thủ công
                    </button>
                    <a href="/it/workspace" target="_blank" className="bg-gray-100 text-gray-700 border px-3 py-1 rounded text-xs hover:bg-gray-200 text-center font-semibold mt-1">
                      Xem chi tiết (Chat) ↗
                    </a>
                  </div>
                </td>
              </tr>
            ))}
            {tickets.length === 0 && (
              <tr><td colSpan={5} className="text-center py-4 text-gray-500">Chưa có yêu cầu nào.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {evalModalOpen && selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-bold">Đánh giá & Điều phối Ticket #{selectedTicket.id}</h3>
              <button onClick={() => setEvalModalOpen(false)} className="text-gray-400 hover:text-black">✖</button>
            </div>
            
            <div className="p-4 space-y-6">
              {/* PHẦN ĐÁNH GIÁ */}
              <div className="bg-gray-50 p-4 rounded border">
                <h4 className="font-semibold mb-3">1. Đánh giá tình trạng</h4>
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Mức độ nghiêm trọng</label>
                    <select value={evalData.severity} onChange={(e) => setEvalData({...evalData, severity: e.target.value})} className="w-full border rounded p-2 text-sm">
                      <option value="Bình thường">Bình thường</option>
                      <option value="Nghiêm trọng">Nghiêm trọng</option>
                      <option value="Tới hạn">Tới hạn (Khẩn cấp)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Phân loại (Category)</label>
                    <select value={evalData.category} onChange={(e) => setEvalData({...evalData, category: e.target.value})} className="w-full border rounded p-2 text-sm">
                      <option value="Phần mềm">Phần mềm</option>
                      <option value="Phần cứng">Phần cứng</option>
                      <option value="Mạng">Mạng</option>
                      <option value="Khác">Khác</option>
                    </select>
                  </div>
                </div>
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Ghi chú của Admin</label>
                  <input type="text" value={evalData.admin_notes} onChange={(e) => setEvalData({...evalData, admin_notes: e.target.value})} className="w-full border rounded p-2 text-sm" placeholder="Nhập ghi chú cho IT..." />
                </div>
              </div>

              {/* PHẦN ĐIỀU PHỐI THỦ CÔNG & CHIA NHIỆM VỤ */}
              <div className={`p-4 rounded border ${assignMode === 'auto' ? 'bg-gray-100 opacity-60 pointer-events-none' : 'bg-white'}`}>
                <h4 className="font-semibold mb-3">2. Phân công & Chia Nhiệm Vụ (Sub-tasks)</h4>
                
                {assignMode === 'auto' && (
                  <div className="mb-4 text-sm font-semibold text-purple-700 bg-purple-100 p-3 rounded">
                    🚫 Đang ở chế độ Tự động. Tính năng chọn tay bị vô hiệu hóa. Khi bấm Lưu, hệ thống sẽ tự tìm IT rảnh nhất.
                  </div>
                )}
                
                <div className="mb-6">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Phụ trách chính (Primary Assignee)</label>
                  <div className="flex gap-2">
                    <select onChange={(e) => handleAssignPrimary(parseInt(e.target.value))} defaultValue={selectedTicket.assignee?.id || ""} className="flex-1 border rounded p-2 text-sm">
                      <option value="" disabled>--- Chọn IT Phụ Trách ---</option>
                      {onlineITs.map(it => <option key={it.id} value={it.id}>{it.full_name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <label className="block text-sm font-medium text-gray-800 mb-2">Giao Nhiệm Vụ Phụ (Cho nhiều IT cùng làm)</label>
                  <div className="flex gap-2 mb-2">
                    <select value={taskData.assignee_id} onChange={(e) => setTaskData({...taskData, assignee_id: e.target.value})} className="border rounded p-2 text-sm w-1/3">
                      <option value="" disabled>-- Chọn IT --</option>
                      {onlineITs.map(it => <option key={it.id} value={it.id}>{it.full_name}</option>)}
                    </select>
                    <input type="text" value={taskData.task_description} onChange={(e) => setTaskData({...taskData, task_description: e.target.value})} className="border rounded p-2 text-sm flex-1" placeholder="Mô tả công việc (VD: Kéo dây mạng)" />
                    <button onClick={handleAddTask} className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 font-bold">+</button>
                  </div>
                  
                  {/* Danh sách nhiệm vụ hiện tại */}
                  {selectedTicket.tasks && selectedTicket.tasks.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-bold text-gray-500 uppercase mb-2">Nhiệm vụ đã giao:</p>
                      <ul className="space-y-2">
                        {selectedTicket.tasks.map((task: any) => (
                          <li key={task.id} className="flex justify-between items-center bg-gray-50 p-2 rounded border border-gray-100 text-sm">
                            <span><span className="font-semibold text-blue-700">{task.assignee?.full_name}:</span> {task.task_description}</span>
                            <span className={`text-xs px-2 py-1 rounded ${task.is_completed ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                              {task.is_completed ? 'Đã xong' : 'Đang chờ'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* ACTION LƯU */}
              <div className="pt-4 border-t flex justify-end gap-3">
                <button onClick={() => setEvalModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded font-semibold hover:bg-gray-300">
                  Hủy
                </button>
                <button onClick={handleSaveAll} className="px-6 py-2 bg-green-600 text-white rounded font-bold shadow hover:bg-green-700">
                  {assignMode === 'auto' ? 'Lưu & Tự động Điều phối' : 'Lưu Đánh Giá'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
