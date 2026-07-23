import React, { useState, useEffect } from 'react';
import { Bell, User, ArrowRight, LogIn, LogOut, CheckCircle2, MapPin, Clock, Zap, RefreshCw } from 'lucide-react';
import { db } from '../../config/firebase';
import { collection, query, where, orderBy, limit, onSnapshot, getCountFromServer } from 'firebase/firestore';
import { format, formatDistanceToNow } from 'date-fns';
import { useLanguage } from '../../contexts/LanguageContext';

const Home = ({ studentData, onNotificationClick }) => {
    const [logs, setLogs] = useState([]);
    const [loadingLogs, setLoadingLogs] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);
    const { t } = useLanguage();

    useEffect(() => {
        if (!studentData?.student_id || !studentData?.collegeId) return;

        // Fetch unread notifications count
        const notifRef = collection(db, `colleges/${studentData.collegeId}/students/${studentData.id}/notifications`);
        const qNotif = query(notifRef, where('is_read', '==', false));
        
        const unsubscribeNotif = onSnapshot(qNotif, (snapshot) => {
            setUnreadCount(snapshot.docs.length);
        });

        // Fetch recent scan logs
        const logsRef = collection(db, `colleges/${studentData.collegeId}/scanLogs`);
        const qLogs = query(
            logsRef, 
            where('studentId', '==', studentData.student_id),
            where('status', '!=', 'pending'),
            orderBy('status'), // Firestore requires ordering by the inequality field first
            orderBy('scannedAt', 'desc'),
            limit(4)
        );

        const unsubscribeLogs = onSnapshot(qLogs, (snapshot) => {
            const logsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Note: Since we order by status first due to firestore limitations, we re-sort locally
            logsData.sort((a, b) => {
                const timeA = a.scannedAt?.toMillis ? a.scannedAt.toMillis() : 0;
                const timeB = b.scannedAt?.toMillis ? b.scannedAt.toMillis() : 0;
                return timeB - timeA;
            });
            setLogs(logsData);
            setLoadingLogs(false);
        }, (error) => {
            console.error("Error fetching logs: ", error);
            setLoadingLogs(false);
        });

        return () => {
            unsubscribeNotif();
            unsubscribeLogs();
        };
    }, [studentData]);

    const initials = studentData?.full_name
        ?.split(' ')
        .map(n => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase() || 'ST';

    return (
        <div className="flex-1 bg-[#f8f9fb] pb-24 overflow-y-auto font-sans">
            {/* Header */}
            <header className="flex justify-between items-center p-6 bg-white shadow-sm border-b border-gray-100">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 flex items-center justify-center overflow-hidden">
                        <img src="/vishnu-logo.png" alt="Vishnu Logo" className="w-full h-full object-contain" />
                    </div>
                    <h1 className="text-xl font-black text-gray-900 tracking-tight">Vishnu Pass</h1>
                </div>

                <button 
                    onClick={onNotificationClick}
                    className="relative p-1 text-gray-400 hover:text-[#f47c20] transition-colors"
                >
                    <Bell className="w-6 h-6" />
                    {unreadCount > 0 && (
                        <span className="absolute top-0 right-0 min-w-[18px] h-[18px] px-1 bg-orange-500 text-white text-[8px] font-black rounded-full border-2 border-white flex items-center justify-center animate-in zoom-in duration-300">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </button>
            </header>

            {/* Main Content */}
            <div className="p-6 space-y-8">

                {/* Profile Dossier Card */}
                <div className="bg-white rounded-[40px] border border-gray-100 shadow-[0_15px_40px_rgba(0,0,0,0.03)] p-8 relative overflow-hidden">
                    {/* Background accent */}
                    <div className="absolute top-0 right-0 w-48 h-48 bg-orange-50/50 rounded-full blur-3xl -translate-y-24 translate-x-24" />

                    <div className="relative z-10">
                        {/* Profile Info Row */}
                        <div className="flex items-center gap-6 mb-10">
                            <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-white shadow-lg bg-orange-50 flex-shrink-0">
                                {studentData?.photo_url ? (
                                    <img src={studentData.photo_url} alt="Student" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full rounded-full flex items-center justify-center text-[#f47c20] text-2xl font-black">
                                        {initials}
                                    </div>
                                )}
                            </div>
                            <div>
                                <span className="inline-block px-3 py-1 bg-orange-50 text-[#f47c20] text-[10px] font-black uppercase tracking-widest rounded-full mb-2">
                                    {studentData?.year_of_study || '3rd'} Year Student
                                </span>
                                <h2 className="text-2xl font-black text-gray-900 leading-tight">{studentData?.full_name || 'Vishnu Vardhan'}</h2>
                                <p className="text-gray-400 font-bold text-sm tracking-wide">ID: {studentData?.student_id || 'V21CS102'}</p>
                            </div>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 gap-y-8">
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Department</p>
                                <p className="text-sm font-black text-gray-900">{studentData?.departments?.name || studentData?.department || 'Computer Science'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Blood Group</p>
                                <p className="text-sm font-black text-gray-900">{studentData?.blood_group || 'O+ Positive'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Validity</p>
                                <p className="text-sm font-black text-emerald-500">Until {studentData?.valid_until ? format(new Date(studentData.valid_until), 'MMMM yyyy') : 'June 2025'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Campus</p>
                                <p className="text-sm font-black text-gray-900">{studentData?.campus || 'Main Campus'}</p>
                            </div>
                        </div>
                        <div className="mt-10 pt-8 border-t border-gray-50 flex items-center justify-end overflow-hidden">
                            {/* View High Fidelity Pass Button */}
                            <button 
                                onClick={() => logs[0] && window.dispatchEvent(new CustomEvent('viewPass', { detail: logs[0] }))}
                                disabled={logs.length === 0}
                                className="h-12 px-5 bg-gray-50 hover:bg-gray-100 text-[#1a2b3c] rounded-2xl flex items-center gap-2.5 transition-all active:scale-95 disabled:opacity-30 flex-shrink-0"
                            >
                                <Zap className="w-4 h-4 text-[#f47c20]" />
                                <span className="text-[11px] font-[900] uppercase tracking-wider">Digital Pass</span>
                            </button>
                        </div>
                    </div>
                </div>


                {/* Latest Activity Table Section */}
                <section className="bg-white rounded-[40px] border border-gray-100 shadow-[0_15px_40px_rgba(0,0,0,0.03)] overflow-hidden">
                    <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Clock className="w-5 h-5 text-[#f47c20]" />
                            <h3 className="text-lg font-black text-gray-900 tracking-tight">Latest Activity</h3>
                        </div>
                        <button 
                            onClick={() => window.dispatchEvent(new CustomEvent('changeTab', { detail: 'logs' }))}
                            className="text-[13px] font-bold text-[#f47c20] hover:underline flex items-center gap-1"
                        >
                            View All <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        {loadingLogs ? (
                            <div className="py-20 text-center">
                                <RefreshCw className="w-8 h-8 animate-spin text-gray-200 mx-auto mb-3" />
                                <p className="text-sm font-bold text-gray-400">Syncing logs...</p>
                            </div>
                        ) : logs.length === 0 ? (
                            <div className="py-20 text-center px-10">
                                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <MapPin className="w-8 h-8 text-gray-200" />
                                </div>
                                <h4 className="text-gray-900 font-bold mb-1">No Recent Access</h4>
                                <p className="text-xs text-gray-400 font-medium">Your campus entries and exits will appear here.</p>
                            </div>
                        ) : (
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-[#f8f9fb]/50">
                                        <th className="px-8 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Gate</th>
                                        <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                                        <th className="px-8 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Time</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {logs.map((log) => {
                                        const isEntry = (log.movement_type === 'IN' || log.movement_type === 'ENTRY' || log.movement_type === 'AUTHORIZED');
                                        const logDate = log.scannedAt?.toDate ? log.scannedAt.toDate() : new Date();
                                        const isValidDate = logDate && !isNaN(logDate.getTime());
                                        return (
                                            <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-8 py-5">
                                                    <p className="text-sm font-bold text-gray-900 leading-tight">
                                                        {log.gateName || 'Gate'}
                                                    </p>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">
                                                        Verified
                                                    </p>
                                                </td>
                                                <td className="px-5 py-5 text-center">
                                                    {(() => {
                                                        let statusLabel = 'PENDING';
                                                        let statusColors = 'bg-amber-50 text-amber-600 border-amber-100';
                                                        let dotColor = 'bg-amber-500';
                                                        
                                                        const status = log.status?.toLowerCase();

                                                        if (status === 'rejected' || status === 'denied') {
                                                            statusLabel = 'DENIED';
                                                            statusColors = 'bg-rose-50 text-rose-600 border-rose-100';
                                                            dotColor = 'bg-rose-500';
                                                        } else if (status === 'approved' || status === 'completed' || status === 'success') {
                                                            if (!isEntry) {
                                                                statusLabel = 'CHECKED OUT';
                                                            } else {
                                                                statusLabel = 'AUTHORIZED';
                                                            }
                                                            statusColors = 'bg-emerald-50 text-emerald-600 border-emerald-100';
                                                            dotColor = 'bg-emerald-500';
                                                        }

                                                        return (
                                                            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[8px] font-black tracking-widest ${statusColors}`}>
                                                                <div className={`w-1 h-1 rounded-full ${dotColor}`} />
                                                                {statusLabel}
                                                            </div>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    <p className="text-[12px] font-bold text-gray-900">
                                                        {isValidDate ? format(logDate, 'hh:mm a') : 'N/A'}
                                                    </p>
                                                    <p className="text-[9px] font-bold text-[#f47c20] uppercase mt-0.5">
                                                        {isValidDate ? formatDistanceToNow(logDate, { addSuffix: true }).replace('about ', '') : ''}
                                                    </p>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </section>

            </div>
        </div>
    );
};

export default Home;
