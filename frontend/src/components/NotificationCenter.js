import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Bell, Check, Users, Vote, MessageSquare, CreditCard, X, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ICON_MAP = {
  participant: <Users className="w-4 h-4 text-blue-500" />,
  vote: <Vote className="w-4 h-4 text-purple-500" />,
  comment: <MessageSquare className="w-4 h-4 text-green-500" />,
  payment: <CreditCard className="w-4 h-4 text-[#D96A53]" />,
  poll: <BarChart3 className="w-4 h-4 text-violet-500" />,
  info: <Bell className="w-4 h-4 text-[#2C4234]" />,
};

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchCount = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications/unread-count');
      setUnreadCount(data.count || 0);
    } catch {}
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data || []);
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await api.post('/notifications/read');
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch {}
  };

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [fetchCount]);

  const handleOpen = () => {
    setOpen(!open);
    if (!open) {
      fetchNotifications();
    }
  };

  return (
    <div className="relative">
      <button onClick={handleOpen}
        className="relative w-9 h-9 rounded-xl bg-[#2C4234]/5 hover:bg-[#2C4234]/10 flex items-center justify-center transition-colors"
        data-testid="notification-bell-btn">
        <Bell className="w-4 h-4 text-[#2C4234]" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#D96A53] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }} transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-80 bg-white rounded-2xl border border-[#E5E4DE] shadow-lg overflow-hidden z-50"
            data-testid="notification-panel">
            <div className="p-4 border-b border-[#E5E4DE] flex items-center justify-between">
              <h3 className="font-['Outfit'] font-medium text-[#1C1E1D] text-sm">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs text-[#D96A53] hover:underline" data-testid="mark-all-read-btn">
                    Mark all read
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="text-[#5C605E] hover:text-[#1C1E1D]">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-sm text-[#5C605E]">No notifications yet</div>
              ) : (
                notifications.map((n, i) => (
                  <div key={i} className={`px-4 py-3 border-b border-[#E5E4DE] last:border-0 flex items-start gap-3 ${!n.read ? 'bg-[#F7F6F2]' : ''}`}>
                    <div className="mt-0.5">{ICON_MAP[n.type] || ICON_MAP.info}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[#1C1E1D]">{n.title}</div>
                      <div className="text-xs text-[#5C605E] truncate">{n.message}</div>
                      <div className="text-[10px] text-[#5C605E] mt-0.5">
                        {n.created_at ? new Date(n.created_at).toLocaleDateString() : ''}
                      </div>
                    </div>
                    {!n.read && <div className="w-2 h-2 rounded-full bg-[#D96A53] mt-2 shrink-0" />}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
