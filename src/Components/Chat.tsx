import React, { useState, useEffect, useRef } from 'react';
import { Send, ArrowRight, User as UserIcon, Clock, Check, CheckCheck, MessageSquare, Search, X, PowerOff, HeadphonesIcon, Headset, CheckCircle2 } from 'lucide-react';
import { api } from '../api-client';
import { io, Socket } from 'socket.io-client';
import { UserType } from '../types';
import toast from 'react-hot-toast';

const BACKEND_URL = import.meta.env.VITE_API_URL || '';

interface Message {
  id: number;
  sender_id: number | string;
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
  type?: string;
  status?: string;
}

interface SupportRequest {
  conversation_id: number;
  patient_name: string;
  profile_picture: string | null;
  created_at: string;
}

export const Chat = ({ user, lang, onClose, targetUserId = null, onSessionEnded }: { user: UserType, lang: string, onClose?: () => void, targetUserId?: number | null, onSessionEnded?: (doctorId: number) => void }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeChat, setActiveChat] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEnding, setIsEnding] = useState(false);
  
  // 🟢 حالات دعم العملاء
  const [activeTab, setActiveTab] = useState<'chats' | 'support'>('chats');
  const [pendingSupportRequests, setPendingSupportRequests] = useState<SupportRequest[]>([]);
  const [isRequestingSupport, setIsRequestingSupport] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const newSocket = io(BACKEND_URL, { withCredentials: true, transports: ['polling', 'websocket'] });
    setSocket(newSocket);
    
    newSocket.on('connect', () => { newSocket.emit('register', user.id); });
    
    newSocket.on('session_ended', (data: { conversation_id: number, closed_by: string, is_patient: boolean }) => {
      if (activeChat && activeChat.conversation_id == data.conversation_id) {
        toast.error(lang === 'ar' ? `تم إنهاء المحادثة من قبل ${data.closed_by}` : `Chat ended by ${data.closed_by}`);
        setActiveChat(null);
        setMessages([]);
        fetchConversations();
        
        if (data.is_patient && onSessionEnded && activeChat.other_user_id) {
          onClose && onClose(); 
          onSessionEnded(activeChat.other_user_id); 
        }
      } else {
        fetchConversations(); 
      }
    });

    // 🟢 الاستماع لطلبات الدعم الجديدة (للموظفين فقط)
    if (user.role === 'admin' || user.role === 'customer_service') {
      newSocket.on('new_support_request', () => {
        toast(lang === 'ar' ? '🔔 طلب دعم فني جديد!' : '🔔 New Support Request!', { icon: '🎧' });
        fetchPendingSupportRequests();
      });
      newSocket.on('support_request_removed', fetchPendingSupportRequests);
    }

    // 🟢 الاستماع لقبول طلب الدعم (للمريض)
    newSocket.on('support_accepted', (data: { conversation_id: number, agent_name: string }) => {
      toast.success(lang === 'ar' ? `تم قبول طلبك بواسطة موظف الدعم: ${data.agent_name}` : `Support accepted by: ${data.agent_name}`);
      fetchConversations();
    });

    return () => { newSocket.close(); };
  }, [user.id, activeChat, user.role]);

  useEffect(() => {
    const convInterval = setInterval(() => {
      fetchConversations();
      if (user.role === 'admin' || user.role === 'customer_service') {
        fetchPendingSupportRequests();
      }
    }, 5000);
    return () => clearInterval(convInterval);
  }, [user.role]);

  useEffect(() => {
    if (!activeChat) return;
    const msgInterval = setInterval(() => {
      api.get(`/api/chat/messages/${activeChat.other_user_id}`).then(res => {
        if (res.status === 'closed') {
           setActiveChat(null);
           toast.error(lang === 'ar' ? 'تم إغلاق هذه المحادثة.' : 'Conversation is closed.');
           return;
        }
        setMessages(prev => {
          if (prev.length !== (res.messages?.length || 0)) {
            setTimeout(scrollToBottom, 100);
          }
          return res.messages || [];
        });
      }).catch(() => {});
    }, 3000);
    return () => clearInterval(msgInterval);
  }, [activeChat]);

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
        if(res.conversation_id) {
          setActiveChat(prev => prev ? {...prev, conversation_id: res.conversation_id} : null);
        }
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
    if (user.role === 'admin' || user.role === 'customer_service') {
      fetchPendingSupportRequests();
    }
  }, [targetUserId]);

  const fetchConversations = async () => {
    try {
      const data = await api.get('/api/chat/conversations');
      setConversations(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchPendingSupportRequests = async () => {
    try {
      const data = await api.get('/api/chat/support/pending');
      setPendingSupportRequests(data);
    } catch (err) { console.error(err); }
  };

  const openChat = async (conv: Conversation) => {
    setActiveChat(conv);
    try {
      const data = await api.get(`/api/chat/messages/${conv.other_user_id}`);
      setMessages(data.messages || []);
      setConversations(prev => prev.map(c => String(c.other_user_id) === String(conv.other_user_id) ? { ...c, unread_count: 0 } : c));
      scrollToBottom();
    } catch (err) { console.error(err); }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat) return;

    const contentToSend = newMessage;
    setNewMessage('');

    const optimisticMsg: Message = {
      id: Date.now(),
      sender_id: String(user.id),
      content: contentToSend,
      is_read: false,
      created_at: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, optimisticMsg]);
    scrollToBottom();

    try {
      await api.post('/api/chat/messages', {
        receiver_id: activeChat.other_user_id,
        content: contentToSend
      });
      
      const res = await api.get(`/api/chat/messages/${activeChat.other_user_id}`);
      if(res.conversation_id && activeChat.conversation_id === 0) {
        setActiveChat({...activeChat, conversation_id: res.conversation_id});
      }
      setMessages(res.messages || []);
      fetchConversations(); 
    } catch (err) {
      toast.error(lang === 'ar' ? 'فشل إرسال الرسالة' : 'Failed to send message');
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
    }
  };

  const endConversation = async () => {
    if (!activeChat || !activeChat.conversation_id) return;
    if (!confirm(lang === 'ar' ? 'هل أنت متأكد من إنهاء هذه المحادثة وحذف الرسائل؟' : 'Are you sure you want to end and clear this chat?')) return;
    
    setIsEnding(true);
    try {
      await api.post(`/api/chat/end/${activeChat.conversation_id}`);
      toast.success(lang === 'ar' ? 'تم إنهاء المحادثة بنجاح' : 'Chat ended successfully');
      
      const doctorIdToRate = activeChat.other_user_id;
      
      setActiveChat(null);
      setMessages([]);
      fetchConversations();
      
      if (user.role === 'patient' && activeChat.type !== 'support' && onSessionEnded) {
        onClose && onClose();
        onSessionEnded(doctorIdToRate);
      }
      
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.error || 'حدث خطأ غير معروف';
      toast.error(lang === 'ar' ? `فشل الإنهاء: ${errorMsg}` : `Error: ${errorMsg}`);
    } finally {
      setIsEnding(false);
    }
  };

  // 🟢 طلب التحدث مع خدمة العملاء (للمريض)
  const requestSupport = async () => {
    if (isRequestingSupport) return;
    setIsRequestingSupport(true);
    try {
      const res = await api.post('/api/chat/support/request', {});
      toast.success(res.message || (lang === 'ar' ? 'تم إرسال طلبك بنجاح، يرجى الانتظار...' : 'Request sent, please wait...'));
      fetchConversations();
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.error || (lang === 'ar' ? 'حدث خطأ أثناء الطلب' : 'Request failed'));
    } finally {
      setIsRequestingSupport(false);
    }
  };

  // 🟢 قبول طلب الدعم (للموظف)
  const acceptSupportRequest = async (convId: number) => {
    try {
      await api.post(`/api/chat/support/accept/${convId}`, {});
      toast.success(lang === 'ar' ? 'تم قبول الطلب، المحادثة مفتوحة الآن.' : 'Request accepted, chat is now open.');
      fetchPendingSupportRequests();
      fetchConversations();
      
      // نبحث عن المحادثة ونفتحها تلقائياً
      setTimeout(() => {
        const acceptedChat = conversations.find(c => c.conversation_id === convId);
        if(acceptedChat) openChat(acceptedChat);
      }, 1000);

    } catch (err: any) {
      toast.error(err.response?.data?.error || err.error || (lang === 'ar' ? 'فشل قبول الطلب' : 'Accept failed'));
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const filteredConversations = conversations.filter(c => c.other_user_name?.toLowerCase().includes(searchQuery.toLowerCase()));

  // 🟢 تحديد هل يمكن للمستخدم رؤية تبويب "الطلبات المعلقة"
  const canSeeSupportTab = user.role === 'admin' || user.role === 'customer_service';

  return (
    <div className="flex h-[85vh] md:h-[650px] w-full bg-slate-50 dark:bg-slate-950 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 transition-colors">
      
      {/* 🟢 القائمة الجانبية (المحادثات النشطة) */}
      <div className={`w-full md:w-1/3 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-all z-20 ${activeChat ? 'hidden md:flex' : 'flex'}`}>
        
        {/* 🟢 الترويسة والتبويبات */}
        <div className="p-0 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors">
          <div className="p-5 flex justify-between items-center">
            <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2"><MessageSquare className="text-blue-600 dark:text-blue-400"/> {lang === 'ar' ? 'الرسائل' : 'Messages'}</h2>
            {onClose && <button onClick={() => {
                if (user.role === 'patient') {
                  setShowRatingModal(true);
                } else {
                  onClose();
                }
              }}>
                <X />
              </button>
            )}
          </div>
          {canSeeSupportTab && (
            <div className="flex border-t border-slate-200 dark:border-slate-800">
              <button onClick={() => setActiveTab('chats')} className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'chats' ? 'border-blue-600 text-blue-600 bg-white dark:bg-slate-800' : 'border-transparent text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                {lang === 'ar' ? 'محادثاتي' : 'My Chats'}
              </button>
              <button onClick={() => setActiveTab('support')} className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors relative ${activeTab === 'support' ? 'border-amber-500 text-amber-600 bg-white dark:bg-slate-800' : 'border-transparent text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                {lang === 'ar' ? 'طلبات الدعم' : 'Support Requests'}
                {pendingSupportRequests.length > 0 && (
                  <span className="absolute top-2 left-2 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center animate-pulse">{pendingSupportRequests.length}</span>
                )}
              </button>
            </div>
          )}
        </div>

        {activeTab === 'chats' ? (
          <>
            <div className="p-4 border-b border-slate-100 dark:border-slate-800">
              <div className="relative">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                <input type="text" placeholder={lang === 'ar' ? 'ابحث في المحادثات...' : 'Search...'} className="w-full pr-12 pl-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium transition-colors dark:text-white" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>

              {/* 🟢 الزر البرتقالي المخصص للظهور على شاشات الهاتف فقط */}
              {user.role !== 'admin' && user.role !== 'customer_service' && (
                <button 
                  onClick={requestSupport}
                  disabled={isRequestingSupport}
                  className="md:hidden mt-4 w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl shadow-md active:scale-95 transition-all disabled:opacity-70"
                >
                  {isRequestingSupport ? (
                     <span className="animate-spin h-5 w-5 border-2 border-white rounded-full border-t-transparent"></span>
                  ) : (
                    <>
                      <Headset size={20} />
                      <span>{lang === 'ar' ? 'التحدث مع خدمة العملاء' : 'Contact Support'}</span>
                    </>
                  )}
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                 <div className="flex justify-center p-8"><span className="animate-spin h-8 w-8 border-4 border-blue-600 rounded-full border-t-transparent"></span></div>
              ) : filteredConversations.length === 0 ? (
                 <div className="text-center text-slate-400 p-12 flex flex-col items-center">
                   <MessageSquare size={48} className="text-slate-300 dark:text-slate-700 mb-4" />
                   <p className="font-bold">{lang === 'ar' ? 'لا توجد محادثات نشطة.' : 'No active chats.'}</p>
                 </div>
              ) : (
                filteredConversations.map(conv => (
                  <div key={conv.conversation_id} onClick={() => openChat(conv)} className={`p-4 border-b border-slate-50 dark:border-slate-800 cursor-pointer flex items-center gap-4 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors ${String(activeChat?.other_user_id) === String(conv.other_user_id) ? 'bg-blue-50/50 dark:bg-slate-800 border-l-4 border-l-blue-600' : ''}`}>
                    <div className="relative shrink-0">
                      {conv.type === 'support' ? (
                        <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center shadow-sm"><Headset size={24} /></div>
                      ) : conv.other_user_image ? (
                        <img src={conv.other_user_image} className="w-14 h-14 rounded-full object-cover border border-slate-200 dark:border-slate-700 shadow-sm" />
                      ) : (
                        <div className="w-14 h-14 bg-blue-100 dark:bg-slate-700 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center font-bold text-xl shadow-sm">{conv.other_user_name?.[0]}</div>
                      )}
                      {conv.unread_count > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-sm animate-pulse">{conv.unread_count}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-bold text-slate-900 dark:text-white truncate text-base">{conv.other_user_name}</h4>
                        <span className="text-[10px] text-slate-400 shrink-0 font-medium" dir="ltr">{new Date(conv.last_message_time).toLocaleTimeString(lang==='ar'?'ar-EG':'en-US', {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                      <p className={`text-sm truncate ${conv.unread_count > 0 ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}>{conv.last_message || (lang === 'ar' ? 'بدء محادثة جديدة' : 'New conversation')}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          // 🟢 تبويب طلبات الدعم (للموظفين فقط)
          <div className="flex-1 overflow-y-auto p-4 bg-amber-50/30 dark:bg-slate-950">
            {pendingSupportRequests.length === 0 ? (
              <div className="text-center text-slate-400 p-12 flex flex-col items-center">
                <CheckCircle2 size={48} className="text-emerald-300 dark:text-emerald-700 mb-4" />
                <p className="font-bold text-slate-600 dark:text-slate-400">{lang === 'ar' ? 'لا توجد طلبات دعم معلقة حالياً.' : 'No pending support requests.'}</p>
              </div>
            ) : (
              pendingSupportRequests.map(req => (
                <div key={req.conversation_id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 mb-3 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    {req.profile_picture ? <img src={req.profile_picture} className="w-10 h-10 rounded-full object-cover" /> : <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-full flex items-center justify-center font-bold">{req.patient_name[0]}</div>}
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white">{req.patient_name}</h4>
                      <span className="text-xs text-slate-500 flex items-center gap-1"><Clock size={12}/> {new Date(req.created_at).toLocaleTimeString(lang==='ar'?'ar-EG':'en-US')}</span>
                    </div>
                  </div>
                  <button onClick={() => acceptSupportRequest(req.conversation_id)} className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 rounded-xl shadow-sm transition-colors text-sm">
                    {lang === 'ar' ? 'قبول وبدء المحادثة' : 'Accept & Chat'}
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* 🟢 نافذة المحادثة المفتوحة */}
      <div className={`w-full md:w-2/3 bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors relative z-10 ${!activeChat ? 'hidden md:flex' : 'flex'}`}>
        <div className="absolute inset-0 z-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }}></div>
        
        {activeChat ? (
          <>
            <div className={`p-4 border-b flex justify-between items-center z-10 shadow-sm transition-colors ${activeChat.type === 'support' ? 'bg-amber-500 border-amber-600 dark:bg-amber-700 dark:border-amber-800' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
              <div className="flex items-center gap-4">
                <button onClick={() => setActiveChat(null)} className={`md:hidden p-2 rounded-full ${activeChat.type === 'support' ? 'text-white hover:bg-amber-600' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}><ArrowRight size={24} className={lang === 'ar' ? '' : 'rotate-180'} /></button>
                <div className="relative">
                  {activeChat.type === 'support' ? (
                    <div className="w-12 h-12 bg-white/20 text-white rounded-full flex items-center justify-center shadow-sm"><Headset size={28} /></div>
                  ) : activeChat.other_user_image ? (
                    <img src={activeChat.other_user_image} className="w-12 h-12 rounded-full object-cover border border-slate-100 dark:border-slate-700" />
                  ) : (
                    <div className="w-12 h-12 bg-blue-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center font-bold text-xl">{activeChat.other_user_name?.[0]}</div>
                  )}
                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full"></span>
                </div>
                <div>
                  <h3 className={`font-extrabold text-lg leading-tight ${activeChat.type === 'support' ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{activeChat.type === 'support' ? (lang==='ar'?'خدمة العملاء':'Customer Support') : activeChat.other_user_name}</h3>
                  <span className={`text-xs font-medium capitalize ${activeChat.type === 'support' ? 'text-amber-100' : 'text-slate-500'}`}>{activeChat.type === 'support' ? (lang==='ar'?'متصل الآن':'Online') : (activeChat.other_user_role === 'patient' ? (lang==='ar'?'مريض':'Patient') : (lang==='ar'?'فريق طبي':'Staff'))}</span>
                </div>
              </div>

              {activeChat.conversation_id > 0 && (
                <button onClick={endConversation} disabled={isEnding} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 shadow-sm border ${activeChat.type === 'support' ? 'bg-amber-600 text-white hover:bg-amber-700 border-amber-700' : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 border-red-100 dark:border-red-800'}`}>
                  <PowerOff size={16} /> <span className="hidden sm:inline">{lang === 'ar' ? 'إنهاء المحادثة' : 'End Chat'}</span>
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 z-10 scrollbar-hide">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
                  <div className="bg-white dark:bg-slate-800 p-6 rounded-full shadow-sm mb-4">
                    <MessageSquare size={48} className="text-blue-100 dark:text-blue-900" />
                  </div>
                  <p className="font-bold text-lg text-slate-600 dark:text-slate-400">{lang === 'ar' ? 'هذه بداية المحادثة، يمكنك إرسال رسالتك الآن.' : 'Start the conversation'}</p>
                </div>
              ) : (
                messages.map((msg, index) => {
  const isMe = String(msg.sender_id) === String(user.id);
  return (
    <div key={msg.id || index} className={`w-full flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[85%] md:max-w-[70%] px-5 py-3 rounded-2xl text-sm md:text-base relative group shadow-sm ${isMe ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-sm'}`}>
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                        <div className={`flex items-center gap-1 justify-end mt-2 text-[10px] ${isMe ? 'text-blue-200' : 'text-slate-400 dark:text-slate-500'}`}>
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

            <div className="p-4 md:p-6 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-10 transition-colors">
              <form onSubmit={sendMessage} className="flex items-center gap-3">
                <input type="text" placeholder={lang === 'ar' ? "اكتب رسالتك هنا..." : "Type a message..."} className="flex-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-6 py-4 rounded-full outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all text-base dark:text-white" value={newMessage} onChange={e => setNewMessage(e.target.value)} />
                <button type="submit" disabled={!newMessage.trim()} className={`w-14 h-14 shrink-0 text-white rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 ${activeChat.type === 'support' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
                  <Send size={24} className={lang === 'ar' ? 'rotate-180 mr-1' : 'ml-1'} />
                </button>
              </form>
            </div>
          </>
        ) : (
          // 🟢 الشاشة الافتراضية إذا لم يتم اختيار أي محادثة (مع زر الدعم الفني للمرضى)
          <div className="flex-1 flex flex-col items-center justify-center z-10 relative p-8 text-center bg-slate-50 dark:bg-slate-950">
            <div className="w-32 h-32 bg-white dark:bg-slate-900 rounded-full shadow-sm flex items-center justify-center mb-6 border border-slate-100 dark:border-slate-800">
              <HeadphonesIcon size={56} className="text-blue-600 dark:text-blue-500" />
            </div>
            
            <h3 className="text-3xl font-black text-slate-800 dark:text-white mb-3">{lang === 'ar' ? 'مرحباً بك في مركز المحادثات' : 'Welcome to Chat Center'}</h3>
            <p className="text-base text-slate-500 dark:text-slate-400 max-w-md leading-relaxed mb-10">
              {lang === 'ar' ? 'اختر محادثة من القائمة الجانبية للبدء، أو اطلب المساعدة من فريق خدمة العملاء.' : 'Select a chat from the sidebar to start, or request help from our support team.'}
            </p>

            {/* 🟢 الزر السحري لطلب خدمة العملاء (يظهر للمرضى فقط أو المستخدمين العاديين) */}
            {user.role !== 'admin' && user.role !== 'customer_service' && (
              <button 
                onClick={requestSupport}
                disabled={isRequestingSupport}
                className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-2xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all disabled:opacity-70 disabled:hover:translate-y-0"
              >
                {isRequestingSupport ? (
                   <span className="animate-spin h-6 w-6 border-4 border-white rounded-full border-t-transparent"></span>
                ) : (
                  <>
                    <Headset size={28} className="group-hover:animate-bounce" />
                    <span className="text-lg">{lang === 'ar' ? 'التحدث مع خدمة العملاء' : 'Contact Customer Support'}</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};