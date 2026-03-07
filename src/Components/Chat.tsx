import React, { useState, useEffect, useRef } from 'react';
import { Send, ArrowRight, User as UserIcon, Clock, Check, CheckCheck, MessageSquare, Search, X } from 'lucide-react';
import { api } from '../api-client';
import { io, Socket } from 'socket.io-client';
import { UserType } from '../types';
import toast from 'react-hot-toast';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface Message {
  id: number;
  sender_id: number;
  content: string;
  is_read: boolean;
  created_at: string;
}

interface Conversation {
  conversation_id: number;
  other_user_id: number;
  other_user_name: string;
  other_user_role: string;
  other_user_image: string | null;
  last_message: string;
  last_message_time: string;
  unread_count: number;
}

export const Chat = ({ user, lang, onClose, targetUserId = null }: { user: UserType, lang: string, onClose?: () => void, targetUserId?: number | null }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeChat, setActiveChat] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. الاتصال بالسيرفر (Socket.io) - (كخيار احتياطي إذا تم تغيير الاستضافة لاحقاً)
  useEffect(() => {
    const newSocket = io(BACKEND_URL, { withCredentials: true, transports: ['polling', 'websocket'] });
    setSocket(newSocket);
    newSocket.on('connect', () => { newSocket.emit('register', user.id); });
    return () => { newSocket.close(); };
  }, [user.id]);

  // 🟢 2. نظام النبض الذكي (Smart Polling) - يحل مشكلة Vercel ويُظهر الرسائل تلقائياً
  useEffect(() => {
    // تحديث قائمة المحادثات (الجانبية) كل 5 ثواني بصمت
    const convInterval = setInterval(() => {
      api.get('/api/chat/conversations').then(data => {
        setConversations(data);
      }).catch(() => {});
    }, 5000);

    return () => clearInterval(convInterval);
  }, []);

  useEffect(() => {
    // تحديث المحادثة المفتوحة حالياً كل 3 ثواني بصمت لظهور الرسائل فوراً
    if (!activeChat) return;

    const msgInterval = setInterval(() => {
      api.get(`/api/chat/messages/${activeChat.other_user_id}`).then(res => {
        setMessages(prev => {
          // إذا كان هناك رسائل جديدة، نحدث القائمة وننزل للأسفل
          if (prev.length !== (res.messages?.length || 0)) {
            setTimeout(scrollToBottom, 100);
          }
          return res.messages || [];
        });
      }).catch(() => {});
    }, 3000);

    return () => clearInterval(msgInterval);
  }, [activeChat]);

  // 3. الفتح الفوري للمحادثة المستهدفة (من زر تواصل معي)
  useEffect(() => {
    if (targetUserId) {
      setActiveChat({
        conversation_id: 0,
        other_user_id: targetUserId,
        other_user_name: lang === 'ar' ? 'جاري التحميل...' : 'Loading...',
        other_user_role: 'doctor',
        other_user_image: null,
        last_message: '',
        last_message_time: new Date().toISOString(),
        unread_count: 0
      });
      setMessages([]);

      api.get(`/api/chat/messages/${targetUserId}`).then(res => {
        setMessages(res.messages || []);
        scrollToBottom();
      }).catch(console.error);

      api.get(`/api/public/doctors/${targetUserId}`).then((res: any) => {
        setActiveChat(prev => prev ? {
          ...prev,
          other_user_name: res.name || 'مستخدم',
          other_user_role: res.role || 'user',
          other_user_image: res.profile_picture || null
        } : null);
      }).catch(console.error);
    }

    fetchConversations();
  }, [targetUserId]);

  const fetchConversations = async () => {
    try {
      const data = await api.get('/api/chat/conversations');
      setConversations(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const openChat = async (conv: Conversation) => {
    setActiveChat(conv);
    try {
      const data = await api.get(`/api/chat/messages/${conv.other_user_id}`);
      setMessages(data.messages || []);
      setConversations(prev => prev.map(c => Number(c.other_user_id) === Number(conv.other_user_id) ? { ...c, unread_count: 0 } : c));
      scrollToBottom();
    } catch (err) { console.error(err); }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat) return;

    const tempMsg = newMessage;
    setNewMessage('');

    // الإضافة الفورية الوهمية للشعور بالسرعة
    const optimisticMsg: Message = {
      id: Date.now(),
      sender_id: user.id,
      content: tempMsg,
      is_read: false,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, optimisticMsg]);
    scrollToBottom();

    try {
      await api.post('/api/chat/messages', {
        receiver_id: activeChat.other_user_id,
        content: tempMsg
      });
      
      // تحديث صامت فوري بعد الإرسال لتأكيد وصولها وجلب الأيدي الحقيقي للرسالة
      const res = await api.get(`/api/chat/messages/${activeChat.other_user_id}`);
      setMessages(res.messages || []);
      fetchConversations(); 
    } catch (err) {
      toast.error(lang === 'ar' ? 'فشل إرسال الرسالة' : 'Failed to send message');
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const filteredConversations = conversations.filter(c => c.other_user_name?.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="flex h-[85vh] md:h-[650px] w-full bg-slate-50 rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
      
      {/* القائمة الجانبية */}
      <div className={`w-full md:w-1/3 bg-white border-r border-slate-200 flex flex-col transition-all z-20 ${activeChat ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2"><MessageSquare className="text-blue-600"/> {lang === 'ar' ? 'الرسائل' : 'Messages'}</h2>
          {onClose && <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"><X size={24}/></button>}
        </div>
        
        <div className="p-4 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
            <input type="text" placeholder={lang === 'ar' ? 'ابحث في المحادثات...' : 'Search...'} className="w-full pr-12 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium transition-shadow" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
             <div className="flex justify-center p-8"><span className="animate-spin h-8 w-8 border-4 border-blue-600 rounded-full border-t-transparent"></span></div>
          ) : filteredConversations.length === 0 ? (
             <div className="text-center text-slate-400 p-12 flex flex-col items-center">
               <MessageSquare size={48} className="text-slate-200 mb-4" />
               <p className="font-bold">{lang === 'ar' ? 'لا توجد محادثات سابقة.' : 'No conversations.'}</p>
             </div>
          ) : (
            filteredConversations.map(conv => (
              <div key={conv.conversation_id} onClick={() => openChat(conv)} className={`p-4 border-b border-slate-50 cursor-pointer flex items-center gap-4 hover:bg-blue-50 transition-colors ${Number(activeChat?.other_user_id) === Number(conv.other_user_id) ? 'bg-blue-50/50 border-l-4 border-l-blue-600' : ''}`}>
                <div className="relative shrink-0">
                  {conv.other_user_image ? <img src={conv.other_user_image} className="w-14 h-14 rounded-full object-cover border border-slate-200 shadow-sm" /> : <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-xl shadow-sm">{conv.other_user_name?.[0]}</div>}
                  {conv.unread_count > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-sm animate-pulse">{conv.unread_count}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-bold text-slate-900 truncate text-base">{conv.other_user_name}</h4>
                    <span className="text-[10px] text-slate-400 shrink-0 font-medium" dir="ltr">{new Date(conv.last_message_time).toLocaleTimeString(lang==='ar'?'ar-EG':'en-US', {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                  <p className={`text-sm truncate ${conv.unread_count > 0 ? 'font-bold text-blue-600' : 'text-slate-500'}`}>{conv.last_message || (lang === 'ar' ? 'بدء محادثة جديدة' : 'New conversation')}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* نافذة الدردشة المباشرة */}
      <div className={`w-full md:w-2/3 bg-slate-50 flex flex-col transition-all relative z-10 ${!activeChat ? 'hidden md:flex' : 'flex'}`}>
        
        <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }}></div>

        {activeChat ? (
          <>
            <div className="p-4 bg-white border-b border-slate-200 flex items-center gap-4 z-10 shadow-sm">
              <button onClick={() => setActiveChat(null)} className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-full"><ArrowRight size={24} className={lang === 'ar' ? '' : 'rotate-180'} /></button>
              
              <div className="relative">
                {activeChat.other_user_image ? <img src={activeChat.other_user_image} className="w-12 h-12 rounded-full object-cover border border-slate-100" /> : <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-xl">{activeChat.other_user_name?.[0]}</div>}
                <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></span>
              </div>
              
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg leading-tight">{activeChat.other_user_name}</h3>
                <span className="text-xs text-slate-500 font-medium capitalize">{activeChat.other_user_role === 'patient' ? (lang==='ar'?'مريض':'Patient') : (lang==='ar'?'طبيب / صيدلي':'Medical Staff')}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 z-10 scrollbar-hide">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <div className="bg-white p-6 rounded-full shadow-sm mb-4">
                    <MessageSquare size={48} className="text-blue-100" />
                  </div>
                  <p className="font-bold text-lg text-slate-600">{lang === 'ar' ? 'ابدأ المحادثة الآن' : 'Start the conversation'}</p>
                  <p className="text-sm mt-1">{lang === 'ar' ? 'أرسل رسالتك وسيرد عليك في أقرب وقت.' : 'Send your message and they will reply soon.'}</p>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isMe = Number(msg.sender_id) === Number(user.id);
                  return (
                    <div key={msg.id || index} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[85%] md:max-w-[70%] px-5 py-3 rounded-2xl text-sm md:text-base relative group shadow-sm ${isMe ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm'}`}>
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                        <div className={`flex items-center gap-1 justify-end mt-2 text-[10px] ${isMe ? 'text-blue-200' : 'text-slate-400'}`}>
                          <span dir="ltr" className="font-medium">{new Date(msg.created_at).toLocaleTimeString(lang==='ar'?'ar-EG':'en-US', {hour: '2-digit', minute:'2-digit'})}</span>
                          {isMe && (msg.is_read ? <CheckCheck size={14} className="text-blue-300"/> : <Check size={14}/>)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 md:p-6 bg-white border-t border-slate-200 z-10">
              <form onSubmit={sendMessage} className="flex items-center gap-3">
                <input type="text" placeholder={lang === 'ar' ? "اكتب رسالتك هنا..." : "Type a message..."} className="flex-1 bg-slate-100 border border-slate-200 px-6 py-4 rounded-full outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-base" value={newMessage} onChange={e => setNewMessage(e.target.value)} />
                <button type="submit" disabled={!newMessage.trim()} className="w-14 h-14 shrink-0 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-blue-700 transition-transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100">
                  <Send size={24} className={lang === 'ar' ? 'rotate-180 mr-1' : 'ml-1'} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center z-10 text-slate-400 relative p-8 text-center">
            <div className="w-32 h-32 bg-white rounded-full shadow-sm flex items-center justify-center mb-6">
              <MessageSquare size={56} className="text-blue-100" />
            </div>
            <h3 className="text-2xl font-black text-slate-700 mb-2">{lang === 'ar' ? 'صحة طيبة للرسائل' : 'Taiba Health Chat'}</h3>
            <p className="text-base text-slate-500 max-w-sm leading-relaxed">{lang === 'ar' ? 'اختر محادثة من القائمة الجانبية للبدء بالتواصل، أو ابحث عن طبيب لبدء محادثة جديدة.' : 'Select a conversation from the sidebar to start chatting.'}</p>
          </div>
        )}
      </div>

    </div>
  );
};