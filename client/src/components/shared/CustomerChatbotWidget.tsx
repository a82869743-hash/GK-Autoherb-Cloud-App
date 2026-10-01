import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bot, X, Send, Sparkles, Phone, ExternalLink, ChevronDown,
  Car, Shield, Package, ShoppingBag, Calendar, HelpCircle, Loader2, RefreshCw
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useChatbotSession, useSendChatMessage, ChatMessage } from '../../api/hooks/useChatbot';

export default function CustomerChatbotWidget() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Retrieve or create persistent session ID
  const [sessionId, setSessionId] = useState<string>(() => {
    let sid = localStorage.getItem('gk_chatbot_session_id');
    if (!sid) {
      sid = 'session_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
      localStorage.setItem('gk_chatbot_session_id', sid);
    }
    return sid;
  });

  // Query chat history
  const { data: sessionData, isLoading: loadingSession } = useChatbotSession(sessionId);
  const sendMut = useSendChatMessage();

  // Load initial messages from server
  useEffect(() => {
    if (sessionData?.messages) {
      setMessages(sessionData.messages);
    }
  }, [sessionData]);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized]);

  // Global event listener to allow other components (like Dashboard) to open the chatbot with a prompt
  useEffect(() => {
    const handleTrigger = (e: any) => {
      const prompt = e.detail?.prompt;
      setIsOpen(true);
      setIsMinimized(false);
      if (prompt) {
        handleSendPrompt(prompt);
      }
    };
    window.addEventListener('gk-open-chatbot', handleTrigger);
    return () => window.removeEventListener('gk-open-chatbot', handleTrigger);
  }, [sessionId]);

  const handleSendPrompt = async (textToSend: string) => {
    if (!textToSend.trim() || sendMut.isPending) return;

    const userMsg: ChatMessage = {
      sender: 'user',
      message: textToSend,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');

    try {
      const botResponse = await sendMut.mutateAsync({
        session_id: sessionId,
        message: textToSend,
        customer_name: user?.name,
        customer_phone: user?.mobile
      });

      if (botResponse) {
        setMessages(prev => [...prev, botResponse]);
      }
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          sender: 'bot',
          message: 'I encountered a brief connection issue. Please feel free to retry or call our studio helpline directly!',
          metadata: {
            actionUrl: 'tel:+919876543210',
            actionLabel: 'Call Studio (+91 98765 43210)',
            chips: ['Helpline Number', 'Book a Slot', 'Packages']
          }
        }
      ]);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendPrompt(inputText);
  };

  const handleResetSession = () => {
    const newSid = 'session_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
    localStorage.setItem('gk_chatbot_session_id', newSid);
    setSessionId(newSid);
    setMessages([]);
  };

  return (
    <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 font-sans">
      {/* ─── Floating Launcher Pill (When Closed) ─── */}
      {!isOpen && (
        <button
          onClick={() => { setIsOpen(true); setIsMinimized(false); }}
          className="group relative flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-[#111111] via-[#1c1917] to-[#262626] hover:to-[#D32F2F] text-white rounded-full shadow-2xl border border-white/10 hover:border-red-500/40 transition-all duration-300 active:scale-95 animate-bounce-short"
        >
          {/* Pulsing indicator */}
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#D32F2F]" />
          </span>

          <div className="w-7 h-7 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center">
            <Bot size={18} />
          </div>

          <div className="text-left pr-1 hidden sm:block">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">Studio Assistant</p>
            <p className="text-xs font-black text-white mt-0.5">Ask GK Concierge</p>
          </div>

          <div className="sm:hidden text-xs font-bold">Ask AI</div>
        </button>
      )}

      {/* ─── Chat Window (When Open) ─── */}
      {isOpen && (
        <div className={`w-[92vw] sm:w-[410px] bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col transition-all duration-300 ${
          isMinimized ? 'h-16' : 'h-[580px] max-h-[82vh]'
        }`}>
          {/* Header */}
          <div className="relative bg-gradient-to-r from-[#111111] via-[#1a1a1a] to-[#242424] px-5 py-3.5 text-white flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-500 flex items-center justify-center font-bold">
                  <Bot size={20} />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#111]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-sm font-black text-white tracking-wide">GK Studio Concierge</h4>
                  <span className="px-1.5 py-0.2 bg-red-500/20 border border-red-500/30 text-red-400 rounded text-[9px] font-bold uppercase">
                    AI Live
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">Services, Packages, Tracking & Support</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <a
                href="tel:+919876543210"
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-colors"
                title="Call Studio Helpline"
              >
                <Phone size={14} />
              </a>
              <button
                onClick={handleResetSession}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-colors"
                title="New Chat Session"
              >
                <RefreshCw size={14} />
              </button>
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-colors"
              >
                <ChevronDown size={16} className={`transition-transform duration-200 ${isMinimized ? 'rotate-180' : ''}`} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Body Content (if not minimized) */}
          {!isMinimized && (
            <>
              {/* Message Feed */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/60">
                {loadingSession && (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 size={24} className="animate-spin text-[#D32F2F]" />
                  </div>
                )}

                {messages.map((m, idx) => {
                  const isBot = m.sender === 'bot';
                  const isAdmin = m.sender === 'admin';
                  const meta = m.metadata;

                  return (
                    <div key={idx} className={`flex flex-col ${isBot || isAdmin ? 'items-start' : 'items-end'}`}>
                      {/* Sender pill */}
                      <span className="text-[10px] font-bold text-slate-400 mb-1 px-1">
                        {isAdmin ? 'Studio Manager (Direct)' : isBot ? 'GK AutoHerb AI' : 'You'}
                      </span>

                      {/* Bubble */}
                      <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                        isAdmin
                          ? 'bg-amber-500 text-white shadow-md rounded-tl-sm'
                          : isBot
                          ? 'bg-white text-slate-800 border border-slate-200/80 shadow-xs rounded-tl-sm'
                          : 'bg-[#D32F2F] text-white font-medium shadow-md shadow-red-600/10 rounded-tr-sm'
                      }`}>
                        <div className="whitespace-pre-wrap">{m.message}</div>

                        {/* Interactive Action Link (if provided by bot) */}
                        {meta?.actionUrl && (
                          <div className="mt-2.5 pt-2 border-t border-slate-100/80 flex items-center">
                            {meta.actionUrl.startsWith('tel:') ? (
                              <a
                                href={meta.actionUrl}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#D32F2F] text-white rounded-xl font-bold text-[11px] shadow-xs hover:bg-[#b71c1c] transition-all"
                              >
                                <Phone size={12} />
                                <span>{meta.actionLabel || 'Call Studio Helpline'}</span>
                              </a>
                            ) : (
                              <button
                                onClick={() => {
                                  setIsOpen(false);
                                  navigate(meta.actionUrl!);
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#111111] hover:bg-[#D32F2F] text-white rounded-xl font-bold text-[11px] shadow-xs transition-all"
                              >
                                <ExternalLink size={12} />
                                <span>{meta.actionLabel || 'Open in Portal'}</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Message Suggestion Chips */}
                      {meta?.chips && meta.chips.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2 max-w-[90%]">
                          {meta.chips.map((chip, chipIdx) => (
                            <button
                              key={chipIdx}
                              onClick={() => handleSendPrompt(chip)}
                              disabled={sendMut.isPending}
                              className="px-2.5 py-1 bg-white hover:bg-red-50 border border-slate-200 hover:border-red-300 text-slate-700 hover:text-[#D32F2F] rounded-full text-[11px] font-bold transition-all shadow-2xs active:scale-95 text-left"
                            >
                              {chip}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Sending loader bubble */}
                {sendMut.isPending && (
                  <div className="flex items-center gap-2 p-3 bg-white border border-slate-200/80 rounded-2xl rounded-tl-sm w-fit text-slate-500 shadow-xs">
                    <Loader2 size={14} className="animate-spin text-[#D32F2F]" />
                    <span className="text-xs font-medium">GK Concierge is checking details...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick Prompt Bar */}
              <div className="px-3 py-1.5 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
                {[
                  { label: '🏎️ Track Car', prompt: 'Where is my car and what is the job status?' },
                  { label: '💎 Packages', prompt: 'What are the membership packages and savings?' },
                  { label: '🛠️ Detailing Rates', prompt: 'What are your rates for ceramic coating and wash?' },
                  { label: '🛍️ Store Products', prompt: 'What car accessories do you have in stock?' },
                  { label: '📞 Call Helpline', prompt: 'Please give me the studio phone number and location' },
                  { label: '📝 Request Callback', prompt: 'Please call me back with a custom quote' },
                ].map((item, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendPrompt(item.prompt)}
                    disabled={sendMut.isPending}
                    className="px-2.5 py-1 bg-slate-50 hover:bg-red-50 border border-slate-200/80 hover:border-red-200 text-slate-600 hover:text-[#D32F2F] rounded-lg text-[10px] font-bold whitespace-nowrap transition-all active:scale-95"
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Input Form */}
              <form onSubmit={handleFormSubmit} className="p-3 bg-white border-t border-slate-100 flex items-center gap-2 shrink-0">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Ask about wash, packages, tracking, or parts..."
                  className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-[#D32F2F] outline-none transition-all"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || sendMut.isPending}
                  className="w-10 h-10 rounded-2xl bg-[#D32F2F] hover:bg-[#b71c1c] text-white flex items-center justify-center transition-all disabled:opacity-40 shadow-xs active:scale-95 shrink-0"
                >
                  <Send size={16} />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}
