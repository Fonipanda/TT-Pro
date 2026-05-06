import { useState, useRef, useEffect } from "react";
import { api } from "@/lib/api";
import { MessageSquare, X, Send, Sparkles } from "lucide-react";

export default function ChatAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Bonjour ! Je suis TT Pro Copilot. Pose-moi une question sur les joueurs, le ranking, les règles ou les pronostics. 🏓" },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sessionId] = useState(() => `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const endRef = useRef(null);

  useEffect(() => {
    if (open && endRef.current) endRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setSending(true);
    try {
      const r = await api.post("/ai/chat", { session_id: sessionId, message: text });
      setMessages((m) => [...m, { role: "assistant", content: r.data.reply }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", content: "Désolé, une erreur est survenue. Réessaie dans un instant." }]);
    }
    setSending(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-50 w-14 h-14 bg-[#FF3B30] hover:bg-[#FF5C53] text-white shadow-2xl flex items-center justify-center transition-colors"
        data-testid="chat-toggle-btn"
        aria-label="Open chat"
      >
        {open ? <X size={22} /> : <MessageSquare size={22} />}
      </button>

      {open && (
        <div
          className="fixed bottom-24 right-5 z-50 w-[92vw] sm:w-[420px] h-[70vh] sm:h-[560px] bg-[#0A0A0A] border border-white/10 flex flex-col shadow-2xl tt-fade-in"
          data-testid="chat-panel"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-[#FF3B30]" />
              <span className="font-heading text-xl tracking-wider">TT PRO COPILOT</span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Claude 4.5</span>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" data-testid="chat-messages">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                data-testid={`chat-msg-${i}`}
              >
                <div
                  className={`max-w-[85%] px-3 py-2 text-sm whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-[#FF3B30] text-white"
                      : "bg-white/5 text-zinc-200 border border-white/5"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="px-3 py-2 bg-white/5 text-zinc-400 text-sm border border-white/5">
                  <span className="inline-block animate-pulse">...</span>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="border-t border-white/5 p-3 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Pose ta question..."
              className="flex-1 bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#FF3B30]"
              data-testid="chat-input"
            />
            <button
              onClick={send}
              disabled={sending}
              className="bg-[#FF3B30] hover:bg-[#FF5C53] disabled:opacity-50 text-white px-3 py-2 transition-colors"
              data-testid="chat-send-btn"
              aria-label="Send"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
