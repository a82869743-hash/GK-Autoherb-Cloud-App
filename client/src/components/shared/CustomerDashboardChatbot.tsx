import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bot, Send, Sparkles, Phone, ExternalLink, RefreshCw, 
  ChevronDown, ChevronUp, Loader2, ArrowRight, CheckCircle2,
  Car, Shield, Award, HelpCircle
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useChatbotSession, useSendChatMessage, ChatMessage } from '../../api/hooks/useChatbot';
import { OWNER_STUDIO_LOCATION } from '../../utils/locationService';

// Helper to render markdown bolding (**bold**) and preserve linebreaks
function renderFormattedMessage(text: string) {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <span className="whitespace-pre-wrap leading-relaxed">
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={index} className="font-extrabold text-slate-900">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      })}
    </span>
  );
}

export default function CustomerDashboardChatbot() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const firstName = user?.name?.split(' ')[0] || 'Member';

  // Retrieve or initialize session ID stored in localStorage
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

  // Load messages from server or set default welcome
  useEffect(() => {
    if (sessionData?.messages && sessionData.messages.length > 0) {
      setMessages(sessionData.messages);
    } else {
      setMessages([
        {
          sender: 'bot',
          message: `Hello ${firstName}! 👋 Welcome to GK AutoHerb Concierge AI.\n\nI can provide instant answers on:\n• 🚗 Live status & tracking for your vehicle in bay\n• 💎 Ceramic coating vs PPF recommendations & pricing\n• 📦 Annual membership package savings\n• 🛍️ Genuine detailing store products & car accessories\n\nHow can I help you today?`,
          metadata: {
            chips: [
              '🏎️ Track My Car Progress',
              '💎 Detailing Packages',
              '🛡️ Ceramic vs PPF Difference',
              '💰 Service & Wash Rates',
              '🛍️ Car Care Store',
              '📞 Studio Helpline & Location'
            ]
          },
          created_at: new Date().toISOString()
        }
      ]);
    }
  }, [sessionData, firstName]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (!isCollapsed) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isCollapsed]);

  // Global event listener in case other widgets send prompts
  useEffect(() => {
    const handleTrigger = (e: any) => {
      const prompt = e.detail?.prompt;
      setIsCollapsed(false);
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
          message: 'I had trouble connecting to the workshop system. Please try again or connect directly with our studio helpline!',
          metadata: {
            actionUrl: 'tel:+919408424541',
            actionLabel: 'Call Studio (+91 94084 24541)',
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
    setMessages([
      {
        sender: 'bot',
        message: `Hello ${firstName}! 👋 New chat session started. What can I assist you with today?`,
        metadata: {
          chips: [
            '🏎️ Track My Car Progress',
            '💎 Detailing Packages',
            '🛡️ Ceramic vs PPF Difference',
            '💰 Service & Wash Rates',
            '📞 Studio Helpline & Location'
          ]
        },
        created_at: new Date().toISOString()
      }
    ]);
  };

  return (
    <div className="relative rounded-3xl overflow-hidden bg-white border border-slate-200/90 shadow-[0_10px_30px_rgba(0,0,0,0.05)] transition-all duration-300">
      {/* ─── Chatbot Header Bar ─── */}
      <div className="relative z-10 px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-red-50/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#D32F2F] via-rose-600 to-red-700 p-[1px] shadow-md shadow-red-500/25 flex items-center justify-center">
              <div className="w-full h-full bg-white rounded-[15px] flex items-center justify-center text-[#D32F2F]">
                <Bot size={22} className="animate-pulse" />
              </div>
            </div>
            {/* Live Online Ping Indicator */}
            <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white" />
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                GK Studio AI Concierge
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-red-50 border border-red-200 text-[#D32F2F] text-[9px] font-black uppercase tracking-wider inline-flex items-center gap-1 shadow-2xs">
                <Sparkles size={10} />
                24/7 AI
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Instant pricing, live vehicle status & detailing assistance
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-1.5">
          <a
            href="tel:+919408424541"
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 transition-all text-xs font-bold flex items-center gap-1.5 shadow-2xs"
            title="Call Studio Directly"
          >
            <Phone size={14} className="text-emerald-600" />
            <span className="hidden sm:inline">Call Studio</span>
          </a>

          <button
            onClick={handleResetSession}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 hover:text-slate-900 transition-all shadow-2xs"
            title="Start New Chat Session"
          >
            <RefreshCw size={14} />
          </button>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 hover:text-slate-900 transition-all shadow-2xs"
            title={isCollapsed ? 'Expand Chat' : 'Collapse Chat'}
          >
            {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
        </div>
      </div>

      {/* ─── Chatbot Body & Conversation ─── */}
      {!isCollapsed && (
        <div className="relative z-10 flex flex-col">
          {/* Messages Scroll Area */}
          <div className="h-[340px] sm:h-[380px] overflow-y-auto p-4 sm:p-5 space-y-3.5 bg-slate-50/60 scroll-smooth">
            {loadingSession && (
              <div className="flex items-center justify-center py-8 text-slate-500 gap-2">
                <Loader2 size={18} className="animate-spin text-[#D32F2F]" />
                <span className="text-xs font-semibold">Connecting to GK AI workshop neural engine...</span>
              </div>
            )}

            {messages.map((m, idx) => {
              const isBot = m.sender === 'bot';
              const isAdmin = m.sender === 'admin';
              const meta = m.metadata;

              return (
                <div 
                  key={idx} 
                  className={`flex flex-col ${isBot || isAdmin ? 'items-start' : 'items-end'} animate-fade-in`}
                >
                  {/* Sender Tag */}
                  <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] font-bold text-slate-400">
                    {isBot && (
                      <span className="flex items-center gap-1 text-[#D32F2F] font-extrabold">
                        <Bot size={11} />
                        GK Concierge
                      </span>
                    )}
                    {isAdmin && (
                      <span className="text-amber-700 font-black flex items-center gap-1">
                        Studio Manager (Live Support)
                      </span>
                    )}
                    {!isBot && !isAdmin && (
                      <span className="text-slate-600 font-bold">You</span>
                    )}
                  </div>

                  {/* Message Bubble */}
                  <div className={`max-w-[88%] sm:max-w-[80%] rounded-2xl px-4 py-3 text-xs sm:text-[13px] leading-relaxed shadow-sm ${
                    isAdmin
                      ? 'bg-amber-50 border border-amber-200 text-amber-900 rounded-tl-sm'
                      : isBot
                      ? 'bg-white border border-slate-200/90 text-slate-800 rounded-tl-sm'
                      : 'bg-gradient-to-r from-[#D32F2F] to-[#b71c1c] text-white font-medium rounded-tr-sm shadow-red-600/20'
                  }`}>
                    {renderFormattedMessage(m.message)}

                    {/* Bot Action Buttons (e.g. Call Studio or Navigate to route) */}
                    {meta?.actionUrl && (
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center">
                        {meta.actionUrl.startsWith('tel:') ? (
                          <a
                            href={meta.actionUrl}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#D32F2F] hover:bg-[#b71c1c] text-white rounded-xl font-bold text-xs shadow-sm transition-all active:scale-95"
                          >
                            <Phone size={13} />
                            <span>{meta.actionLabel || 'Call Studio (+91 94084 24541)'}</span>
                          </a>
                        ) : (
                          <button
                            onClick={() => {
                              if (meta.actionUrl?.startsWith('http')) {
                                window.open(meta.actionUrl, '_blank');
                              } else {
                                navigate(meta.actionUrl!);
                              }
                            }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 text-white hover:bg-black rounded-xl font-bold text-xs shadow-sm transition-all active:scale-95"
                          >
                            <ExternalLink size={13} />
                            <span>{meta.actionLabel || 'View Details'}</span>
                            <ArrowRight size={12} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Suggestion Chips Returned by Bot */}
                  {meta?.chips && meta.chips.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2.5 max-w-[95%]">
                      {meta.chips.map((chip, chipIdx) => (
                        <button
                          key={chipIdx}
                          onClick={() => handleSendPrompt(chip)}
                          disabled={sendMut.isPending}
                          className="px-3 py-1.5 bg-white hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-700 hover:text-[#D32F2F] rounded-xl text-[11px] font-bold transition-all active:scale-95 text-left flex items-center gap-1 shadow-2xs"
                        >
                          <span>{chip}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Thinking / Sending Indicator */}
            {sendMut.isPending && (
              <div className="flex items-center gap-2.5 p-3 bg-white border border-slate-200 rounded-2xl rounded-tl-sm w-fit text-slate-600 shadow-sm">
                <Loader2 size={15} className="animate-spin text-[#D32F2F]" />
                <span className="text-xs font-semibold">GK Concierge is checking workshop records...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ─── Quick Suggestion Prompts Tray ─── */}
          <div className="px-4 py-2 bg-slate-100/70 border-t border-slate-200/80 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider shrink-0">
              Quick:
            </span>
            {[
              { label: '🏎️ Track My Car', prompt: 'Where is my car and what is the job status?' },
              { label: '💎 Detailing Packages', prompt: 'What are the membership packages and savings?' },
              { label: '🛡️ Ceramic vs PPF', prompt: 'What is the difference between ceramic coating and PPF?' },
              { label: '💰 Service Rates', prompt: 'What are your rates for ceramic coating and wash?' },
              { label: '🛍️ Store Accessories', prompt: 'What car accessories do you have in stock?' },
              { label: '📞 Studio Helpline', prompt: 'Please give me the studio phone number, location, and doorstep pickup details' },
            ].map((item, i) => (
              <button
                key={i}
                onClick={() => handleSendPrompt(item.prompt)}
                disabled={sendMut.isPending}
                className="px-2.5 py-1 bg-white hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-700 hover:text-[#D32F2F] rounded-lg text-[11px] font-bold whitespace-nowrap transition-all active:scale-95 shadow-2xs"
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* ─── Message Input Bar ─── */}
          <form onSubmit={handleFormSubmit} className="p-3 sm:p-4 bg-white border-t border-slate-200/80 flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ask GK Concierge anything (e.g., 'Track car', 'Ceramic price', 'Book slot')..."
                className="w-full px-4 py-3 bg-slate-50 focus:bg-white border border-slate-200 focus:border-[#D32F2F] focus:ring-2 focus:ring-red-100 rounded-2xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 outline-none transition-all pr-10"
              />
              <Bot size={17} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            <button
              type="submit"
              disabled={!inputText.trim() || sendMut.isPending}
              className="px-4 py-3 bg-gradient-to-r from-[#D32F2F] to-[#b71c1c] hover:from-[#b71c1c] hover:to-[#8b0000] text-white rounded-2xl flex items-center justify-center gap-1.5 font-bold text-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-red-600/25 active:scale-95 shrink-0"
            >
              <span>Send</span>
              <Send size={15} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
