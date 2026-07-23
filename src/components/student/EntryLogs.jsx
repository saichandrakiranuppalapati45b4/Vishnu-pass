import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../config/firebase';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';
import { ChevronLeft, LogIn, LogOut, Save, Loader2, X, ShieldCheck } from 'lucide-react';
import VerificationResult from './VerificationResult';

const EntryLogs = ({ studentData }) => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, entries, exits
    const [selectedLog, setSelectedLog] = useState(null);

    useEffect(() => {
        if (!studentData?.student_id || !studentData?.collegeId) return;
        
        setLoading(true);
        const logsRef = collection(db, `colleges/${studentData.collegeId}/scanLogs`);
        const qLogs = query(
            logsRef, 
            where('studentId', '==', studentData.student_id),
            where('status', '!=', 'pending'),
            orderBy('status'), 
            orderBy('scannedAt', 'desc'),
            limit(50)
        );

        const unsubscribe = onSnapshot(qLogs, (snapshot) => {
            const logsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Re-sort locally because of firestore's inequality ordering requirement
            logsData.sort((a, b) => {
                const timeA = a.scannedAt?.toMillis ? a.scannedAt.toMillis() : 0;
                const timeB = b.scannedAt?.toMillis ? b.scannedAt.toMillis() : 0;
                return timeB - timeA;
            });
            setLogs(logsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching entry logs:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [studentData]);

    // Determine if a log is entry or exit based on movement_type
    const isEntry = (log) => {
        const type = (log.movement_type || '').toLowerCase();
        return type.includes('entry') || type.includes('authorized') || type.includes('in');
    };

    // Filter logs
    const filteredLogs = logs.filter(log => {
        if (filter === 'all') return true;
        const entry = isEntry(log);
        return filter === 'entries' ? entry : !entry;
    });

    const filterTabs = [
        { id: 'all', label: 'All' },
        { id: 'entries', label: 'Entry' },
        { id: 'exits', label: 'Exit' },
    ];

    return (
        <div className="flex-1 flex flex-col bg-[#f8f9fb] overflow-hidden">
            {/* Filter Tabs */}
            <div className="bg-white px-5 py-4 border-b border-gray-100 shadow-sm sticky top-0 z-20">
                <div className="flex bg-gray-100 rounded-xl p-1 mb-2">
                    {filterTabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setFilter(tab.id)}
                            className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all duration-200 ${filter === tab.id
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Logs List Table */}
            <div className="flex-1 overflow-x-auto pb-28">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <Loader2 className="w-8 h-8 animate-spin text-[#f47c20] mb-3" />
                        <p className="text-sm font-bold">Assembling access history...</p>
                    </div>
                ) : filteredLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-gray-400 px-10 text-center">
                        <div className="w-20 h-20 rounded-3xl bg-white shadow-sm flex items-center justify-center mb-6">
                            <ShieldCheck className="w-10 h-10 text-gray-200" />
                        </div>
                        <h3 className="text-base font-black text-gray-900 mb-1 tracking-tight">Access Record Empty</h3>
                        <p className="text-xs text-gray-400 font-medium leading-relaxed">Your verified entries and exits will be displayed here in a high-fidelity table.</p>
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 z-10 bg-[#f8f9fb]">
                            <tr className="border-b border-gray-100">
                                <th className="px-2 py-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] w-[30%]">Gate / Point</th>
                                <th className="px-2 py-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] text-center w-[12%]">Activity</th>
                                <th className="px-2 py-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] text-center w-[23%]">Status</th>
                                <th className="px-2 py-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] w-[20%]">Datetime</th>
                                <th className="px-2 py-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] text-right w-[15%]">Time Ago</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 bg-white">
                            {filteredLogs.map(log => {
                                const entry = isEntry(log);
                                const statusRaw = log.status?.toLowerCase();
                                const statusColor = (statusRaw === 'completed' || statusRaw === 'approved' || statusRaw === 'success') ? 'text-emerald-500' : 
                                               (statusRaw === 'pending') ? 'text-amber-500' : 'text-rose-500';
                                
                                const logDate = log.scannedAt?.toDate ? log.scannedAt.toDate() : new Date();
                                const isValidDate = logDate && !isNaN(logDate.getTime());
                                
                                return (
                                    <tr 
                                        key={log.id} 
                                        onClick={() => setSelectedLog(log)}
                                        className="hover:bg-gray-50/50 transition-colors cursor-pointer group active:bg-gray-100"
                                    >
                                        <td className="px-2 py-3">
                                            <div className="flex items-center gap-1">
                                                <div className={`w-2 h-2 rounded-full ${statusColor}`} />
                                                <p className="text-xs font-bold text-gray-900 truncate">
                                                    {log.gateName || 'Authorized Gate'}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-2 py-3 text-center">
                                            <span className={`inline-flex px-1.5 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                                                entry ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-orange-50 text-orange-600 border border-orange-100'
                                            }`}>
                                                {entry ? 'ENTRY' : 'EXIT'}
                                            </span>
                                        </td>
                                        <td className="px-2 py-3 text-center">
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
                                                    if (log.movement_type === 'OUT' || !entry) {
                                                        statusLabel = 'CHECKED OUT';
                                                    } else {
                                                        statusLabel = 'AUTHORIZED';
                                                    }
                                                    statusColors = 'bg-emerald-50 text-emerald-600 border-emerald-100';
                                                    dotColor = 'bg-emerald-500';
                                                }

                                                return (
                                                    <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[8px] font-black tracking-widest ${statusColors}`}>
                                                        <div className={`w-1 h-1 rounded-full ${dotColor}`} />
                                                        {statusLabel}
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                        <td className="px-2 py-3">
                                            <p className="text-[10px] font-bold text-gray-700">
                                                {isValidDate ? format(logDate, 'dd MMM, hh:mm a') : 'Unknown Date'}
                                            </p>
                                        </td>
                                        <td className="px-2 py-3 text-right font-black text-[9px] text-[#f47c20] tracking-tight">
                                            {isValidDate ? formatDistanceToNow(logDate, { addSuffix: true }).toUpperCase() : 'N/A'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>


            {/* Verification Overlay */}
            {selectedLog && (
                <div className="fixed inset-0 z-[100] bg-white animate-in slide-in-from-bottom duration-500 overflow-hidden">
                    <VerificationResult
                        studentData={studentData}
                        gateName={selectedLog.gateName}
                        verifiedAt={selectedLog.scannedAt?.toDate ? selectedLog.scannedAt.toDate() : new Date()}
                        onNextScan={() => setSelectedLog(null)}
                        warning={selectedLog.warning}
                        status={selectedLog.status}
                    />
                </div>
            )}
        </div>
    );
};

export default EntryLogs;
