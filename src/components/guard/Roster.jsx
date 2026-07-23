import React, { useState, useEffect } from 'react';
import { ChevronLeft, Search, SlidersHorizontal, CheckCircle2, Scan, Clock, User, Loader2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { db } from '../../config/firebase';
import { collection, doc, updateDoc, onSnapshot, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';

const GuardRoster = ({ guardData, onScannerOpen, onBack }) => {
    const { t } = useLanguage();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState('All Expected');
    const [expectedStudents, setExpectedStudents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!guardData?.gate_id || !guardData?.collegeId) {
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, `colleges/${guardData.collegeId}/scanLogs`),
            where('gateId', '==', guardData.gate_id),
            where('status', 'in', ['pending', 'approved']),
            orderBy('scannedAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = [];
            snapshot.forEach(docSnap => {
                data.push({ id: docSnap.id, ...docSnap.data() });
            });
            setExpectedStudents(data);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching roster live data", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [guardData?.gate_id, guardData?.collegeId]);

    const handleApprove = async (sessionId) => {
        try {
            if (!guardData?.collegeId) return;
            const logRef = doc(db, `colleges/${guardData.collegeId}/scanLogs`, sessionId);
            
            await updateDoc(logRef, {
                status: 'completed',
                guardUid: guardData.uid,
                guardName: guardData.full_name,
                scannedAt: Timestamp.now()
            });
        } catch (err) {
            console.error("Approval failed", err);
        }
    };

    const visitors = [
        { id: 'v1', name: 'Delivery: Amazon', ref: 'AMZ-9882', vehicle: 'MH-...' },
    ];

    const filteredStudents = expectedStudents.filter(session => {
        const matchesSearch =
            session.studentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            session.studentId?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
    });

    return (
        <div className="flex-1 flex flex-col bg-[#fdfdfd] min-h-screen relative font-sans">
            {/* Header */}
            <header className="px-6 py-6 flex items-center justify-between bg-white border-b border-gray-50 sticky top-0 z-40">
                <button onClick={onBack} className="w-10 h-10 flex items-center justify-center text-gray-800">
                    <ChevronLeft className="w-7 h-7" />
                </button>
                <h2 className="text-xl font-black text-gray-800 tracking-tight">{t('guard.roster.title')}</h2>
                <button className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-[#f47c20]">
                    <SlidersHorizontal className="w-5 h-5" />
                </button>
            </header>

            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 pb-32">
                {/* Search Bar */}
                <div className="relative group">
                    <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#f47c20] transition-colors">
                        <Search className="w-5 h-5" />
                    </div>
                    <input
                        type="text"
                        placeholder={t('guard.roster.searchPlaceholder')}
                        className="w-full bg-[#f1f3f5] border-none rounded-2xl py-4 pl-14 pr-6 text-sm font-bold text-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-[#f47c20]/20 transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Filter Chips */}
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {['All', 'Hostellers', 'Dayscholars'].map((filter) => (
                        <button
                            key={filter}
                            onClick={() => setActiveFilter(filter)}
                            className={`px-6 py-3 rounded-2xl text-[13px] font-black whitespace-nowrap transition-all flex items-center gap-2 ${activeFilter === filter
                                ? 'bg-[#f47c20] text-white shadow-lg shadow-orange-500/20'
                                : 'bg-[#e9ecef] text-gray-500'
                                }`}
                        >
                            {t(`guard.roster.${filter.toLowerCase()}`)}
                            {filter !== 'Flagged' && (
                                <ChevronLeft className={`w-4 h-4 rotate-[-90deg] opacity-50 ${activeFilter === filter ? 'text-white' : 'text-gray-400'}`} />
                            )}
                        </button>
                    ))}
                </div>

                {/* Currently Expected Section */}
                <div>
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="text-[13px] font-black text-gray-900 tracking-[0.1em] uppercase">{t('guard.roster.title')} ({filteredStudents.length})</h3>
                        <span className="text-[11px] font-bold text-orange-400">Live</span>
                    </div>

                    <div className="space-y-4">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-3 bg-white rounded-[32px] border border-gray-50">
                                <Loader2 className="w-8 h-8 text-[#f47c20] animate-spin" />
                                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">{t('guard.roster.loading')}</p>
                            </div>
                        ) : filteredStudents.length === 0 ? (
                            <div className="bg-white rounded-[32px] p-8 text-center border border-dashed border-gray-200">
                                <Clock className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                                <p className="text-sm font-bold text-gray-400">No students waiting at the moment.</p>
                            </div>
                        ) : (
                            filteredStudents.map((session) => {
                                return (
                                    <div
                                        key={session.id}
                                        className={`bg-white rounded-[32px] p-5 shadow-sm border border-gray-50 flex items-center justify-between group active:scale-[0.98] transition-all`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="relative">
                                                <div className={`w-16 h-16 rounded-full border-[3px] border-orange-200 overflow-hidden bg-gray-50 flex items-center justify-center p-0.5 shadow-sm`}>
                                                    <div className="w-full h-full rounded-full overflow-hidden bg-white">
                                                        {session.photoUrl ? (
                                                            <img src={session.photoUrl} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <User className="w-full h-full p-3 text-gray-200" />
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                <h4 className="text-lg font-black text-gray-800 leading-none mb-1.5 tracking-tight group-hover:text-[#f47c20] transition-colors truncate max-w-[150px]">
                                                    {session.studentName || 'Anonymous Student'}
                                                </h4>
                                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-tighter mb-2">
                                                    ID: {session.studentId}
                                                </p>
                                                <span className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-wider bg-orange-50 text-orange-600`}>
                                                    Waiting Verification • {session.scannedAt?.toDate ? formatDistanceToNow(session.scannedAt.toDate(), { addSuffix: true }) : 'Just now'}
                                                </span>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleApprove(session.id)}
                                            className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all bg-[#f47c20] text-white shadow-orange-500/20 active:scale-95`}
                                        >
                                            <CheckCircle2 className="w-6 h-6 border-white/20" />
                                        </button>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Authorized Visitors Section */}
                <div>
                    <h3 className="text-[13px] font-black text-gray-900 tracking-[0.1em] uppercase mb-5">Authorized Visitors ({visitors.length})</h3>
                    <div className="space-y-4">
                        {visitors.map((visitor) => (
                            <div key={visitor.id} className="bg-white rounded-[32px] p-5 border border-gray-50 shadow-sm flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center text-[#f47c20]">
                                        <User className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-black text-gray-800 leading-none mb-1.5 tracking-tight">{visitor.name}</h4>
                                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-tighter">
                                            Ref: {visitor.ref} • Vehicle: {visitor.vehicle}
                                        </p>
                                    </div>
                                </div>
                                <button className="bg-[#f47c20] text-white px-8 py-3 rounded-2xl font-black text-base shadow-lg shadow-orange-500/20 active:scale-95 transition-all">
                                    Verify
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Floating QR FAB */}
            <button
                onClick={onScannerOpen}
                className="fixed bottom-24 right-6 w-16 h-16 bg-[#f47c20] rounded-3xl shadow-2xl shadow-orange-500/40 flex items-center justify-center text-white active:scale-90 transition-all group overflow-hidden z-[60]"
            >
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <Scan className="w-8 h-8 relative z-10" />
            </button>
        </div>
    );
};

export default GuardRoster;
