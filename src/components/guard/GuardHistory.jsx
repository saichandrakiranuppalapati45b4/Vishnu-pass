import React, { useState, useEffect } from 'react';
import { Search, Clock, User, ShieldCheck, ShieldAlert, MoreHorizontal, Loader2, ChevronLeft, CheckCircle2, XCircle, ChevronDown } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { db } from '../../config/firebase';
import { collection, onSnapshot, query, where, orderBy, limit } from 'firebase/firestore';
import { format, isToday, isYesterday } from 'date-fns';

const GuardHistory = ({ guardData, onBack }) => {
    const { t } = useLanguage();
    const [logs, setLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('ALL'); // ALL, SUCCESS, DENIED

    useEffect(() => {
        if (!guardData?.gate_id || !guardData?.collegeId) {
            setIsLoading(false);
            return;
        }

        const q = query(
            collection(db, `colleges/${guardData.collegeId}/scanLogs`),
            where('gateId', '==', guardData.gate_id),
            orderBy('scannedAt', 'desc'),
            limit(100)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = [];
            snapshot.forEach(docSnap => {
                data.push({ id: docSnap.id, ...docSnap.data() });
            });
            setLogs(data);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching history", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [guardData?.gate_id, guardData?.collegeId]);

    const filteredLogs = logs.filter(log => {
        const queryStr = searchQuery.toLowerCase();
        const matchesSearch =
            log.studentName?.toLowerCase().includes(queryStr) ||
            log.studentId?.toLowerCase().includes(queryStr) ||
            log.gateName?.toLowerCase().includes(queryStr);

        const matchesFilter =
            activeFilter === 'ALL' ||
            (activeFilter === 'SUCCESS' && (log.status === 'completed' || log.status === 'approved' || log.status === 'success')) ||
            (activeFilter === 'DENIED' && (log.status === 'denied' || log.status === 'rejected' || log.status === 'expired' || log.status === 'error'));

        return matchesSearch && matchesFilter;
    });

    // Grouping logic
    const groupedLogs = filteredLogs.reduce((acc, log) => {
        const date = log.scannedAt?.toDate ? log.scannedAt.toDate() : new Date();
        let title = format(date, 'MMM dd, yyyy').toUpperCase();

        if (isToday(date)) title = `TODAY, ${format(date, 'MMM dd').toUpperCase()}`;
        else if (isYesterday(date)) title = `YESTERDAY, ${format(date, 'MMM dd').toUpperCase()}`;

        if (!acc[title]) acc[title] = [];
        acc[title].push(log);
        return acc;
    }, {});

    return (
        <div className="flex flex-col min-h-screen bg-[#f8f9fb] animate-in fade-in duration-500 pb-24">
            {/* Header */}
            <header className="px-6 py-4 flex justify-between items-center bg-white sticky top-0 z-40 border-b border-gray-50 shadow-sm shadow-gray-100/50">
                <button onClick={onBack} className="w-10 h-10 flex items-center justify-center text-gray-400 active:scale-90 transition-transform">
                    <ChevronLeft className="w-6 h-6 text-[#f47c20]" />
                </button>
                <h1 className="text-xl font-black text-gray-800 tracking-tight">{t('guard.history.title')}</h1>
                <div className="relative group">
                    <button className="w-10 h-10 flex items-center justify-center text-gray-400">
                        <MoreHorizontal className="w-6 h-6" />
                    </button>
                </div>
            </header>

            {/* Search & Filters */}
            <div className="px-4 py-5 bg-white space-y-5">
                {/* Search Bar */}
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#f47c20] group-focus-within:text-[#f47c20] transition-colors" />
                    <input
                        type="text"
                        placeholder={t('guard.history.searchPlaceholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 bg-[#f5f5f5]/80 border-transparent rounded-[20px] focus:bg-white focus:ring-2 focus:ring-[#f47c20]/10 focus:border-[#f47c20] text-sm font-bold text-gray-700 transition-all placeholder:text-gray-400"
                    />
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
                    <button
                        onClick={() => setActiveFilter('ALL')}
                        className={`px-6 py-2.5 rounded-2xl text-xs font-black tracking-wider uppercase flex items-center gap-2 whitespace-nowrap transition-all ${activeFilter === 'ALL' ? 'bg-[#f47c20] text-white shadow-lg shadow-[#f47c20]/20' : 'bg-[#fff5ef] text-[#f47c20]'
                            }`}
                    >
                        {t('guard.history.allScans')} <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={() => setActiveFilter('SUCCESS')}
                        className={`px-6 py-2.5 rounded-2xl text-xs font-black tracking-wider uppercase flex items-center gap-2 whitespace-nowrap transition-all ${activeFilter === 'SUCCESS' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-white border border-gray-100 text-gray-400'
                            }`}
                    >
                        <CheckCircle2 className={`w-4 h-4 ${activeFilter === 'SUCCESS' ? 'text-emerald-500' : 'text-emerald-400'}`} />
                        {t('guard.history.verified')}
                    </button>
                    <button
                        onClick={() => setActiveFilter('DENIED')}
                        className={`px-6 py-2.5 rounded-2xl text-xs font-black tracking-wider uppercase flex items-center gap-2 whitespace-nowrap transition-all ${activeFilter === 'DENIED' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-white border border-gray-100 text-gray-400'
                            }`}
                    >
                        <XCircle className={`w-4 h-4 ${activeFilter === 'DENIED' ? 'text-rose-500' : 'text-rose-400'}`} />
                        {t('guard.history.denied')}
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 px-4 mt-2">
                {isLoading ? (
                    <div className="py-20 flex flex-col items-center justify-center text-gray-300">
                        <Loader2 className="w-10 h-10 animate-spin mb-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">{t('guard.history.updating')}</span>
                    </div>
                ) : filteredLogs.length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center text-center opacity-50">
                        <div className="w-20 h-20 bg-gray-100 rounded-[32px] flex items-center justify-center mb-4">
                            <Clock className="w-10 h-10" />
                        </div>
                        <p className="text-sm font-black text-gray-600 uppercase tracking-tight">{t('guard.history.noHistory')}</p>
                        <p className="text-[10px] font-bold text-gray-400 max-w-[200px] mt-1">{t('guard.history.noHistoryDesc') || 'Try changing filters'}</p>
                    </div>
                ) : (
                    Object.entries(groupedLogs).map(([title, dayLogs]) => (
                        <div key={title} className="mb-8">
                            <h3 className="px-2 mb-4 text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase">{title}</h3>
                            <div className="space-y-3">
                                {dayLogs.map((log) => (
                                    <div key={log.id} className="bg-white rounded-[28px] p-4 flex items-center justify-between border border-transparent hover:border-[#f47c20]/10 transition-colors shadow-sm active:scale-[0.98]">
                                        <div className="flex items-center gap-4">
                                            <div className="relative">
                                                <div className="w-14 h-14 rounded-full bg-slate-50 overflow-hidden border border-slate-100 flex items-center justify-center">
                                                    {log.photoUrl ? (
                                                        <img src={log.photoUrl} alt="P" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full bg-[#f4a261]/10 flex items-center justify-center text-[#f4a261] font-black text-lg">
                                                            {log.studentName?.[0] || 'U'}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className={`absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center shadow-sm ${(['completed', 'approved', 'success'].includes(log.status)) ? 'bg-emerald-500' : 'bg-rose-500'
                                                    }`}>
                                                    {(['completed', 'approved', 'success'].includes(log.status)) ? <CheckCircle2 className="w-3.5 h-3.5 text-white" /> : <XCircle className="w-3.5 h-3.5 text-white" />}
                                                </div>
                                            </div>
                                            <div>
                                                <h4 className="text-base font-black text-gray-800 leading-none mb-1.5 tracking-tight group-hover:text-[#f47c20] transition-colors">
                                                    {log.studentName || 'STUDENT'}
                                                </h4>
                                                <p className="text-[11px] font-bold text-gray-400 mb-1 leading-none">
                                                    ID: {log.studentId || 'GUEST-SCAN'}
                                                </p>
                                                <p className={`text-[11px] font-bold leading-none ${(['completed', 'approved', 'success'].includes(log.status)) ? 'text-[#f47c20]' : 'text-rose-500'}`}>
                                                    {log.gateName || 'Main Entrance'} {!(['completed', 'approved', 'success'].includes(log.status)) && ' • Denied'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1.5">
                                            <div className="text-[11px] font-black text-slate-400 uppercase tracking-tighter">
                                                {log.scannedAt?.toDate ? format(log.scannedAt.toDate(), 'hh:mm a') : 'Now'}
                                            </div>
                                            {!(['completed', 'approved', 'success'].includes(log.status)) && (
                                                <span className="bg-rose-50 text-rose-500 text-[8px] font-black px-2 py-0.5 rounded-full border border-rose-100 uppercase tracking-widest">
                                                    Denied
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default GuardHistory;
