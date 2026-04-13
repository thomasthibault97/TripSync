import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Send, X, Minimize2, Maximize2, Bot, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AiChatbot({ tripId }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      api.get(`/chat/history?trip_id=${tripId || 'general'}`).then(r => {
        if (r.data?.length) setMessages(r.data);
        else setMessages([{ role: 'assistant', content: "Hey! I'm your TripSync AI assistant. Ask me anything about trip planning - best destinations, budget tips, activities, restaurants, or help deciding between options!", created_at: new Date().toISOString() }]);
      }).catch(() => {
        setMessages([{ role: 'assistant', content: "Hey! I'm your TripSync AI assistant. How can I help plan your trip?", created_at: new Date().toISOString() }]);
      });
    }
  }, [open, tripId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: 'user', content: input, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const { data } = await api.post('/chat', { message: input, trip_id: tripId || null });
      setMessages(prev => [...prev, { role: 'assistant', content: data.response, created_at: new Date().toISOString() }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I had trouble processing that. Please try again.", created_at: new Date().toISOString() }]);
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="fixed bottom-20 right-6 z-40 w-14 h-14 bg-[#2C4234] hover:bg-[#1F3025] text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105"
        data-testid="open-chatbot-btn">
        <Sparkles className="w-6 h-6" />
      </button>
    );
  }

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className={`fixed z-40 bg-white rounded-2xl border border-[#E5E4DE] shadow-xl overflow-hidden flex flex-col
          ${minimized ? 'bottom-20 right-6 w-72 h-14' : 'bottom-20 right-6 w-96 h-[500px] max-h-[70vh]'}`}
        data-testid="ai-chatbot-panel">
        {/* Header */}
        <div className="bg-[#2C4234] text-white p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#D96A53]" />
            <span className="font-['Outfit'] font-medium text-sm">TripSync AI</span>
            {loading && <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setMinimized(!minimized)} className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center">
              {minimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </button>
            <button onClick={() => setOpen(false)} className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center" data-testid="close-chatbot-btn">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {!minimized && (
          <>
            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-full bg-[#2C4234]/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-4 h-4 text-[#2C4234]" />
                    </div>
                  )}
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed
                    ${msg.role === 'user' ? 'bg-[#2C4234] text-white rounded-br-md' : 'bg-[#F7F6F2] text-[#1C1E1D] rounded-bl-md'}`}>
                    {msg.content}
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-7 h-7 rounded-full bg-[#D96A53]/10 flex items-center justify-center shrink-0 mt-0.5">
                      <User className="w-4 h-4 text-[#D96A53]" />
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#2C4234]/10 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-[#2C4234]" />
                  </div>
                  <div className="bg-[#F7F6F2] rounded-2xl rounded-bl-md px-4 py-3 flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-[#5C605E] animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full bg-[#5C605E] animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full bg-[#5C605E] animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
            </div>

            {/* Quick actions */}
            {messages.length <= 1 && (
              <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                {['Best destination for our group?', 'Budget tips for Barcelona', 'What to do in 3 days?', 'Restaurant recommendations'].map(q => (
                  <button key={q} onClick={() => { setInput(q); }}
                    className="text-[10px] bg-[#2C4234]/5 text-[#2C4234] px-2.5 py-1 rounded-full hover:bg-[#2C4234]/10 transition-colors">
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="p-3 border-t border-[#E5E4DE] flex gap-2">
              <Textarea value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Ask about destinations, budget, activities..."
                className="min-h-[40px] max-h-[80px] rounded-xl border-[#E5E4DE] bg-[#F7F6F2] text-sm resize-none"
                data-testid="chat-input" />
              <Button onClick={sendMessage} disabled={loading || !input.trim()} size="icon"
                className="bg-[#2C4234] hover:bg-[#1F3025] text-white rounded-xl h-10 w-10 shrink-0"
                data-testid="chat-send-btn">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
