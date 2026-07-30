"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // FastAPI chuẩn OAuth2 yêu cầu gửi form data
    const formData = new URLSearchParams();
    formData.append("username", email); // Tên field bắt buộc là username
    formData.append("password", password);

    try {
      const res = await fetch("http://127.0.0.1:8000/login", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Sai email hoặc mật khẩu");
      }

      const data = await res.json();
      
      // Lưu token vào localStorage để dùng cho các API sau này
      localStorage.setItem("token", data.access_token);

      // Điều hướng động dựa vào Role
      if (data.role === "IT-Manager") {
        router.push("/admin/dashboard");
      } else if (data.role === "IT-Supporter") {
        router.push("/it/workspace");
      } else {
        router.push("/user/home");
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form onSubmit={handleLogin} className="bg-white p-8 rounded-lg shadow-md w-96">
        <h2 className="text-2xl font-bold mb-6 text-center text-blue-600">Hệ Thống Helpdesk</h2>
        {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}
        
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Email</label>
          <input 
            type="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
            required 
          />
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-700 mb-2">Mật khẩu</label>
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
            required 
          />
        </div>
        
        <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition">
          Đăng Nhập
        </button>
      </form>
    </div>
  );
}