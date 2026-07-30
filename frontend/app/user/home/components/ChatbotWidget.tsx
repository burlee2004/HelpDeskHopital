import { useState, useEffect, useRef } from 'react';

// 1. Định nghĩa kiểu dữ liệu cho Props truyền vào Component
interface ChatbotWidgetProps {
  onFallbackToTicket: (chatLog: string) => void;
}

// 2. Định nghĩa kiểu dữ liệu cho Tin nhắn
interface Message {
  sender: 'ai' | 'user';
  text: string;
}

// 3. Định nghĩa kiểu dữ liệu cho Lịch sử chat
interface HistoryItem {
  id: number;
  question: string;
  answer: string;
  created_at?: string;
}

// HÀM MỚI: Xử lý Markdown cơ bản (In đậm ** và Gạch đầu dòng *)
const formatMessage = (text: string) => {
  // Tách text theo từng dòng để xử lý ngắt dòng và gạch đầu dòng
  const lines = text.split('\n');

  return (
    <ul className="space-y-1">
      {lines.map((line, lineIndex) => {
        // Kiểm tra xem dòng có bắt đầu bằng dấu "* " hoặc "- " không
        const isBullet = line.trim().startsWith('* ') || line.trim().startsWith('- ');
        
        // Cắt bỏ ký tự "* " ở đầu để đưa vào thẻ <li>
        const cleanLine = isBullet ? line.trim().substring(2) : line;

        // Tách chuỗi dựa trên các cặp **...** để in đậm
        const parts = cleanLine.split(/(\*\*.*?\*\*)/g);
        const formattedParts = parts.map((part, index) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <strong key={index} className="font-semibold text-gray-900">
                {part.slice(2, -2)}
              </strong>
            );
          }
          return <span key={index}>{part}</span>;
        });

        // Nếu là dòng trống thì ngắt dòng
        if (!line.trim()) return <div key={lineIndex} className="h-2"></div>;

        // Nếu là danh sách liệt kê, trả về thẻ <li> với style đẹp
        if (isBullet) {
          return (
            <li key={lineIndex} className="ml-5 list-disc marker:text-blue-500">
              {formattedParts}
            </li>
          );
        }

        // Nếu là text bình thường
        return (
          <div key={lineIndex} className="leading-relaxed">
            {formattedParts}
          </div>
        );
      })}
    </ul>
  );
};

export default function ChatbotWidget({ onFallbackToTicket }: ChatbotWidgetProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'history'>('chat');
  
  const [messages, setMessages] = useState<Message[]>([
    { sender: 'ai', text: 'Xin chào! Tôi là trợ lý AI Helpdesk. Bạn đang gặp sự cố gì ở bệnh viện cần tôi hỗ trợ không?' }
  ]);
  
  const [input, setInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:8000/chatbot/history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data: HistoryItem[] = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.error("Lỗi lấy lịch sử chat:", err);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab]);

  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input;
    setMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setInput('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:8000/chatbot/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ question: userText })
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, { sender: 'ai', text: data.answer }]);
      } else {
        setMessages(prev => [...prev, { sender: 'ai', text: 'Có lỗi xảy ra khi kết nối với AI. Bạn thử lại nhé!' }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { sender: 'ai', text: 'Không thể kết nối mạng đến máy chủ.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicketFallback = () => {
    const chatLog = messages
      .map(m => `${m.sender === 'user' ? 'Nhân viên' : 'AI Helpdesk'}: ${m.text}`)
      .join('\n');
    
    const contextSummary = `[Lịch sử chat với AI]:\n${chatLog}\n\n[Mô tả bổ sung của người dùng]: `;
    
    onFallbackToTicket(contextSummary);
    setIsOpen(false); 
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl hover:bg-blue-700 transition-all transform hover:scale-105"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.63m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h.008m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h.008M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 0 1-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8Z" />
          </svg>
        </button>
      )}

      {isOpen && (
        <div className="flex h-[500px] w-[400px] flex-col rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden transition-all">
          <div className="flex items-center justify-between bg-blue-600 p-4 text-white">
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse"></div>
              <h3 className="font-semibold text-sm">Trợ lý IT ảo (Gemini AI)</h3>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white hover:text-gray-200 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex border-b border-gray-200 bg-gray-50 text-sm text-center font-medium">
            <button
              onClick={() => setActiveTab('chat')}
              className={`w-1/2 py-3 transition-colors ${activeTab === 'chat' ? 'border-b-2 border-blue-600 text-blue-600 bg-white' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Hỏi đáp trực tiếp
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`w-1/2 py-3 transition-colors ${activeTab === 'history' ? 'border-b-2 border-blue-600 text-blue-600 bg-white' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Lịch sử giải pháp
            </button>
          </div>

          {activeTab === 'chat' ? (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                {messages.map((msg, index) => (
                  <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div 
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[14px] shadow-sm 
                      ${msg.sender === 'user' 
                        ? 'bg-blue-600 text-white rounded-br-none' 
                        : 'bg-white text-gray-700 rounded-bl-none border border-gray-200'}`}
                    >
                      {/* ĐÃ CẬP NHẬT: Thay thẻ <p> thành <div> để tránh lỗi lồng block HTML */}
                      <div>{formatMessage(msg.text)}</div>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-white text-gray-500 border border-gray-200 rounded-2xl rounded-bl-none px-4 py-3 text-sm flex items-center space-x-1 shadow-sm">
                      <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></span>
                      <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                      <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {messages.length > 2 && (
                <div className="bg-orange-50/80 p-2 border-t border-orange-100 text-center">
                  <button 
                    onClick={handleCreateTicketFallback}
                    className="text-xs text-orange-700 font-medium hover:text-orange-800 hover:underline transition-colors"
                  >
                    ⚠️ AI không giải quyết được? Nhấn để chuyển thành Ticket IT
                  </button>
                </div>
              )}

              <form onSubmit={handleSendMessage} className="flex border-t border-gray-200 p-3 bg-white">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Mô tả lỗi của bạn (VD: Máy in kẹt giấy)..."
                  className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-shadow"
                  disabled={loading}
                />
                <button
                  type="submit"
                  className="ml-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-blue-300 transition-colors shadow-sm"
                  disabled={loading}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
                  </svg>
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50 space-y-3">
              {history.length === 0 ? (
                <p className="text-center text-sm text-gray-400 mt-10">Bạn chưa lưu lịch sử câu hỏi nào.</p>
              ) : (
                history.map((item) => (
                  <details key={item.id} className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm group">
                    <summary className="text-sm font-semibold text-gray-700 cursor-pointer list-none flex justify-between items-center select-none">
                      <span className="truncate max-w-[90%] flex items-center gap-2">
                        <span className="text-blue-500">❓</span> {item.question}
                      </span>
                      <span className="text-gray-400 group-open:rotate-180 transition-transform duration-300">▼</span>
                    </summary>
                    <div className="mt-3 text-sm text-gray-600 border-t border-gray-100 pt-3 leading-relaxed">
                      {/* ĐÃ CẬP NHẬT: Thay whitespace-pre-line thành div bọc hàm format */}
                      <div>{formatMessage(item.answer)}</div>
                    </div>
                  </details>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}