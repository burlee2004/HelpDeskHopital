// File: DashboardOverview.tsx
"use client";

import { useState, useEffect } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell 
} from 'recharts';

export default function DashboardOverview() {
  // 1. Khai báo các State để lưu trữ dữ liệu động
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0
  });

  const [statusData, setStatusData] = useState<any[]>([]);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 2. Viết hàm gọi API lấy Ticket và tính toán số liệu
  useEffect(() => {
    const fetchDashboardData = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        // Gọi API lấy toàn bộ danh sách Ticket
        const res = await fetch("http://127.0.0.1:8000/tickets/", {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (res.ok) {
          const tickets = await res.json();
          
          // Đếm số lượng theo từng trạng thái
          const openCount = tickets.filter((t: any) => t.status === 'Open').length;
          const inProgressCount = tickets.filter((t: any) => t.status === 'In Progress').length;
          const resolvedCount = tickets.filter((t: any) => t.status === 'Resolved').length;

          // Cập nhật State cho 4 thẻ Thống kê nhanh
          setStats({
            total: tickets.length,
            open: openCount,
            inProgress: inProgressCount,
            resolved: resolvedCount
          });

          // Cập nhật State cho Biểu đồ Tròn
          setStatusData([
            { name: 'Mới (Open)', value: openCount },
            { name: 'Đang xử lý (In Progress)', value: inProgressCount },
            { name: 'Hoàn thành (Resolved)', value: resolvedCount },
          ]);

          // Lưu ý: Biểu đồ cột lưu lượng tuần hiện tại vẫn giữ mock data
          // Vì để nhóm dữ liệu theo ngày cần có trường ngày tháng (vd: created_at) từ backend.
          setWeeklyData([
            { name: 'T2', 'Yêu cầu mới': 12, 'Đã xử lý': 10 },
            { name: 'T3', 'Yêu cầu mới': 19, 'Đã xử lý': 15 },
            { name: 'T4', 'Yêu cầu mới': 15, 'Đã xử lý': 20 },
            { name: 'T5', 'Yêu cầu mới': 8, 'Đã xử lý': 12 },
            { name: 'T6', 'Yêu cầu mới': 22, 'Đã xử lý': 18 },
            { name: 'T7', 'Yêu cầu mới': 5, 'Đã xử lý': 8 },
            { name: 'CN', 'Yêu cầu mới': 2, 'Đã xử lý': 5 },
          ]);
        }
      } catch (error) {
        console.error("Lỗi khi lấy dữ liệu tổng quan:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const PIE_COLORS = ['#ef4444', '#f59e0b', '#10b981']; 

  if (loading) {
    return <div className="flex justify-center items-center h-64 text-gray-500">Đang tải số liệu...</div>;
  }

  return (
    <div className="space-y-6">
      {/* 1. Các thẻ thống kê nhanh (SỬ DỤNG DỮ LIỆU ĐỘNG) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
          <h3 className="text-gray-500 text-sm font-medium">Tổng Ticket</h3>
          <p className="text-3xl font-bold text-gray-800 mt-2">{stats.total}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-red-500">
          <h3 className="text-gray-500 text-sm font-medium">Ticket Đang Mở</h3>
          <p className="text-3xl font-bold text-gray-800 mt-2">{stats.open}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-yellow-500">
          <h3 className="text-gray-500 text-sm font-medium">Đang Xử Lý</h3>
          <p className="text-3xl font-bold text-gray-800 mt-2">{stats.inProgress}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
          <h3 className="text-gray-500 text-sm font-medium">Đã Giải Quyết</h3>
          <p className="text-3xl font-bold text-gray-800 mt-2">{stats.resolved}</p>
        </div>
      </div>

      {/* 2. Khu vực Biểu đồ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Biểu đồ cột */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Lưu lượng Ticket trong tuần</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                <Tooltip cursor={{ fill: '#f3f4f6' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="Yêu cầu mới" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="Đã xử lý" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Biểu đồ tròn (SỬ DỤNG DỮ LIỆU ĐỘNG) */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Tỷ lệ trạng thái Ticket</h2>
          <div className="h-72 flex justify-center items-center">
            {stats.total === 0 ? (
              <p className="text-gray-500">Chưa có dữ liệu Ticket</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend iconType="circle" layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '14px' }}/>
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}