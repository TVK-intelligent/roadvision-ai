import React, { useState, useRef, useEffect } from 'react';
import { incidentApi } from '../services/incidentApi';
import {
  Bot,
  X,
  Send,
  Sparkles,
  Loader2,
  ChevronDown,
  RotateCcw,
  ExternalLink,
  MapPin,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  referencedIncidents?: Array<{
    id: number;
    trackingCode: string;
    title: string;
    status: string;
    address: string;
    category: string;
  }>;
}

export const AiChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Xin chào! Tôi là **Trợ lý AI RoadVision**.\n\nTôi có thể giúp bạn:\n- 🔍 **Tra cứu tiến độ sự cố** (ví dụ: `#83`, `#RC-6625`)\n- 📸 **Hướng dẫn báo cáo sự cố** mặt đường\n- 🛣️ **Quy chuẩn kỹ thuật bảo trì** TCVN & phân cấp 4 Khu Quản lý Đường bộ',
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [suggestions, setSuggestions] = useState<string[]>([
    'Hôm nay có bao nhiêu sự cố?',
    'Tổng số sự cố đang xử lý?',
    'Kiểm tra sự cố mới nhất',
    'Hướng dẫn quy trình 5 pha xử lý',
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isLoading) return;

    const userMsgId = 'user-' + Date.now();
    const newMessages: ChatMessage[] = [
      ...messages,
      {
        id: userMsgId,
        sender: 'user',
        text,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      },
    ];

    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      // Chuẩn bị lịch sử hội thoại cho Gemini
      const history = newMessages
        .filter((m) => m.id !== 'welcome')
        .slice(-6)
        .map((m) => ({
          role: m.sender === 'user' ? 'user' : 'model',
          content: m.text,
        }));

      const res = await incidentApi.chatWithAi({
        message: text,
        history,
      });

      const data = res.data;
      setMessages((prev) => [
        ...prev,
        {
          id: 'bot-' + Date.now(),
          sender: 'assistant',
          text: data.reply,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          referencedIncidents: data.referencedIncidents,
        },
      ]);

      if (data.suggestions && data.suggestions.length > 0) {
        setSuggestions(data.suggestions);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: 'bot-err-' + Date.now(),
          sender: 'assistant',
          text: 'Xin lỗi bạn, kết nối đến Trợ lý AI đang bị gián đoạn. Bạn vui lòng thử lại sau ít giây nhé!',
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: 'welcome',
        sender: 'assistant',
        text: 'Đã làm mới cuộc hội thoại. Bạn cần Trợ lý AI RoadVision hỗ trợ thêm vấn đề gì?',
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setSuggestions([
      'Kiểm tra sự cố mới nhất',
      'Hướng dẫn quy trình 5 pha xử lý',
      'Quy chuẩn vá ổ gà bê tông nhựa',
    ]);
  };

  // Render markdown đơn giản (bold, bullet, break)
  const formatText = (content: string) => {
    return content.split('\n').map((line, idx) => {
      // In đậm **text**
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <div key={idx} className={line.startsWith('- ') || line.startsWith('* ') ? 'ml-3 list-disc' : 'min-h-[1.2rem]'}>
          {parts.map((p, pIdx) => {
            if (p.startsWith('**') && p.endsWith('**')) {
              return <strong key={pIdx} className="font-semibold text-foreground">{p.slice(2, -2)}</strong>;
            }
            return p;
          })}
        </div>
      );
    });
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Cửa Sổ Chat Box */}
      {isOpen && (
        <div className="mb-4 w-[380px] sm:w-[420px] max-w-[calc(100vw-32px)] h-[580px] max-h-[calc(100vh-100px)] bg-card/95 backdrop-blur-xl border border-border shadow-2xl rounded-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-200">
          {/* Header */}
          <div className="px-4 py-3.5 bg-gradient-to-r from-primary/15 via-primary/5 to-transparent border-b border-border flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center ring-2 ring-primary/30">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <h3 className="text-sm font-semibold text-foreground">Trợ Lý AI RoadVision</h3>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" title="Trực tuyến" />
                </div>
                <p className="text-[11px] text-muted-foreground">Hỏi đáp quy chuẩn & Tra cứu sự cố</p>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={handleResetChat}
                title="Làm mới hội thoại"
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/60 transition"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Thu nhỏ"
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/60 transition"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Danh Sách Tin Nhắn */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs sm:text-sm">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 leading-relaxed shadow-sm ${
                    m.sender === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-none'
                      : 'bg-muted/80 text-foreground border border-border/60 rounded-bl-none'
                  }`}
                >
                  {formatText(m.text)}

                  {/* Card sự cố được trích dẫn (RAG Incident Card) */}
                  {m.referencedIncidents && m.referencedIncidents.length > 0 && (
                    <div className="mt-3 space-y-2 border-t border-border/50 pt-2">
                      <p className="text-[11px] font-semibold text-primary flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Hồ sơ sự cố liên quan:
                      </p>
                      {m.referencedIncidents.map((inc) => (
                        <div
                          key={inc.id}
                          className="bg-card/90 rounded-lg p-2.5 border border-border/80 text-[11px] flex flex-col gap-1 shadow-xs"
                        >
                          <div className="flex items-center justify-between font-medium">
                            <span className="text-foreground">#{inc.id} {inc.trackingCode}</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-primary/10 text-primary border border-primary/20">
                              {inc.status}
                            </span>
                          </div>
                          <div className="text-muted-foreground line-clamp-1">{inc.title}</div>
                          {inc.address && (
                            <div className="flex items-center gap-1 text-muted-foreground text-[10px]">
                              <MapPin className="w-3 h-3 shrink-0" />
                              <span className="truncate">{inc.address}</span>
                            </div>
                          )}
                          <Link
                            to={`/incidents/${inc.id}`}
                            onClick={() => setIsOpen(false)}
                            className="inline-flex items-center gap-1 text-primary hover:underline text-[10px] font-medium mt-0.5"
                          >
                            <span>Xem chi tiết hồ sơ</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground mt-1 px-1">
                  {m.timestamp}
                </span>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center space-x-2 text-muted-foreground bg-muted/50 w-fit px-3 py-2 rounded-2xl rounded-bl-none border border-border/50">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                <span className="text-xs">Trợ lý AI đang suy nghĩ...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Gợi Ý Câu Hỏi Nhanh (Smart Suggestions) */}
          {suggestions.length > 0 && !isLoading && (
            <div className="px-3 py-2 border-t border-border/50 bg-muted/20 flex gap-1.5 overflow-x-auto no-scrollbar">
              {suggestions.slice(0, 3).map((sug, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(sug)}
                  className="shrink-0 text-[11px] bg-card hover:bg-muted text-muted-foreground hover:text-foreground px-2.5 py-1 rounded-full border border-border shadow-xs transition truncate max-w-[200px]"
                >
                  💡 {sug}
                </button>
              ))}
            </div>
          )}

          {/* Ô Nhập Tin Nhắn */}
          <div className="p-3 border-t border-border bg-card/60">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Hỏi về sự cố, tra cứu mã #83, quy chuẩn..."
                disabled={isLoading}
                className="flex-1 bg-muted/60 border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary/50 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none transition disabled:opacity-50"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={!input.trim() || isLoading}
                className="p-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-sm"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Nút Tròn Kích Hoạt Chat (Floating Button) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group relative flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-tr from-primary to-primary/80 text-primary-foreground shadow-xl hover:shadow-primary/30 hover:scale-105 active:scale-95 transition-all duration-200"
        title="Trợ lý AI RoadVision"
      >
        <div className="absolute -top-1 -right-1 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-background" />
        </div>

        {isOpen ? (
          <X className="w-6 h-6 transition-transform group-hover:rotate-90 duration-200" />
        ) : (
          <div className="relative">
            <Bot className="w-7 h-7" />
            <Sparkles className="w-3.5 h-3.5 text-amber-300 absolute -top-1 -right-1.5 animate-bounce" />
          </div>
        )}
      </button>
    </div>
  );
};
