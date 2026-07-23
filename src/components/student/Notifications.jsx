import React, { useState, useEffect } from 'react';
import { Bell, ChevronLeft, CheckCircle2, AlertTriangle, Info, Clock, Trash2 } from 'lucide-react';
import { db } from '../../config/firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { useLanguage } from '../../contexts/LanguageContext';

const Notifications = ({ studentData, onBack }) => {
    const { t } = useLanguage();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!studentData?.id || !studentData?.collegeId) return;

        const notifRef = collection(db, `colleges/${studentData.collegeId}/students/${studentData.id}/notifications`);
        const qNotif = query(notifRef, orderBy('created_at', 'desc'));

        const unsubscribe = onSnapshot(qNotif, (snapshot) => {
            const notifsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setNotifications(notifsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching notifications", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [studentData]);

    const markAsRead = async (id) => {
        try {
            const notifRef = doc(db, `colleges/${studentData.collegeId}/students/${studentData.id}/notifications`, id);
            await updateDoc(notifRef, { is_read: true });
        } catch (error) {
            console.error("Failed to mark notification as read", error);
        }
    };

    const deleteNotification = async (id) => {
        try {
            const notifRef = doc(db, `colleges/${studentData.collegeId}/students/${studentData.id}/notifications`, id);
            await deleteDoc(notifRef);
        } catch (error) {
            console.error("Failed to delete notification", error);
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'success': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
            case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
            default: return <Info className="w-5 h-5 text-blue-500" />;
        }
    };

    const getBgColor = (type) => {
        switch (type) {
            case 'success': return 'bg-emerald-50';
            case 'warning': return 'bg-amber-50';
            default: return 'bg-blue-50';
        }
    };

    return (
        <div className="flex-1 bg-[#f8f9fb] flex flex-col h-full animate-in fade-in duration-300">
            {/* Header */}
            <header className="px-6 py-6 flex items-center justify-between bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={onBack}
                        className="w-10 h-10 flex items-center justify-center text-gray-800 hover:bg-gray-50 rounded-xl transition-colors"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h2 className="text-xl font-black text-gray-900 tracking-tight">Notifications</h2>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mt-1">Updates & Alerts</p>
                    </div>
                </div>
                <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-[#f47c20] relative">
                    <Bell className="w-5 h-5" />
                    {notifications.some(n => !n.is_read) && (
                        <span className="absolute top-2 right-2 w-2 h-2 bg-orange-500 rounded-full border border-white"></span>
                    )}
                </div>
            </header>

            <div className="flex-1 overflow-y-auto px-6 py-8 space-y-4 pb-32">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-8 h-8 border-4 border-[#f47c20] border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading notifications...</p>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-20 h-20 bg-white rounded-[32px] flex items-center justify-center shadow-lg border border-gray-100 mb-6">
                            <Bell className="w-10 h-10 text-gray-200" />
                        </div>
                        <h3 className="text-lg font-black text-gray-900">All caught up!</h3>
                        <p className="text-sm text-gray-400 font-medium px-8 mt-2">No new notifications at the moment. We'll alert you with any updates.</p>
                    </div>
                ) : (
                    notifications.map((n) => {
                        const notifDate = n.created_at?.toDate ? n.created_at.toDate() : new Date();
                        const isValidDate = notifDate && !isNaN(notifDate.getTime());
                        
                        return (
                        <div 
                            key={n.id}
                            onClick={() => !n.is_read && markAsRead(n.id)}
                            className={`group relative bg-white rounded-[28px] p-5 border shadow-sm transition-all duration-300 hover:shadow-md active:scale-98 cursor-pointer ${
                                !n.is_read ? 'border-orange-100 bg-orange-50/5' : 'border-gray-50'
                            }`}
                        >
                            {!n.is_read && (
                                <div className="absolute top-6 right-6 w-2 h-2 bg-[#f47c20] rounded-full"></div>
                            )}

                            <div className="flex gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center shadow-inner ${getBgColor(n.type)}`}>
                                    {getIcon(n.type)}
                                </div>
                                <div className="flex-1 min-w-0 pr-4">
                                    <h4 className={`text-sm tracking-tight mb-1 truncate ${!n.is_read ? 'font-black text-gray-900' : 'font-bold text-gray-700'}`}>
                                        {n.title}
                                    </h4>
                                    <p className="text-xs text-gray-500 font-medium leading-relaxed mb-3">
                                        {n.message}
                                    </p>
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                        <Clock className="w-3 h-3" />
                                        {isValidDate ? formatDistanceToNow(notifDate, { addSuffix: true }) : 'N/A'}
                                    </div>
                                </div>
                                
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        deleteNotification(n.id);
                                    }}
                                    className="absolute bottom-5 right-5 p-2 text-gray-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )})
                )}
            </div>
        </div>
    );
};

export default Notifications;
