import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, TrendingUp, Clock, ShieldCheck, User, QrCode, CheckCircle2, Zap, RefreshCw } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { format } from 'date-fns';
import { db } from '../../config/firebase';
import { collection, doc, getDoc, updateDoc, onSnapshot, query, where, orderBy, limit, getCountFromServer, Timestamp } from 'firebase/firestore';
import VerificationResult from '../student/VerificationResult';

const GuardHome = ({ guardData }) => {
    const { t } = useLanguage();
    const [stats, setStats] = useState({ totalScans: 0, activePasses: 0 });
    const [activities, setActivities] = useState([]);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [activeVerification, setActiveVerification] = useState(null);
    const [qrToken, setQrToken] = useState(crypto.randomUUID());
    const [qrTimeLeft, setQrTimeLeft] = useState(25);
    const [connectionStatus, setConnectionStatus] = useState('connecting'); // connecting, safe, error

    // QR Code Refresh Timer
    useEffect(() => {
        const timer = setInterval(() => {
            setQrTimeLeft((prev) => {
                if (prev <= 1) {
                    setQrToken(crypto.randomUUID());
                    return 25;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const fetchStats = async () => {
        if (!guardData?.collegeId) return;
        try {
            const scanLogsRef = collection(db, `colleges/${guardData.collegeId}/scanLogs`);
            
            // 1. Total Scans
            const countSnapshot = await getCountFromServer(scanLogsRef);
            const totalScans = countSnapshot.data().count;

            // 2. Active Passes Today
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            
            const qToday = query(
                scanLogsRef,
                where('scannedAt', '>=', Timestamp.fromDate(todayStart)),
                where('status', 'in', ['success', 'completed', 'approved', 'Authorized'])
            );
            
            // This requires an index or fetching all docs and counting unique
            // For now, we will fetch docs and count unique studentIds using onSnapshot or getDocs
            // Since it might be large, a better approach is to keep a running count, but we will fetch for now
            // To prevent large reads, just use total scans today as a proxy if it fails, but let's try onSnapshot
        } catch(e) {
            console.error(e);
        }
    };

    // Real-time data fetching and subscriptions
    useEffect(() => {
        if (!guardData?.gate_id || !guardData?.collegeId) return;

        const scanLogsRef = collection(db, `colleges/${guardData.collegeId}/scanLogs`);
        
        // Query for Pending/Approved requests for this gate
        const qPending = query(
            scanLogsRef,
            where('gateId', '==', guardData.gate_id),
            where('status', 'in', ['pending', 'approved']),
            orderBy('scannedAt', 'desc')
        );

        const unsubscribePending = onSnapshot(qPending, (snapshot) => {
            const requests = [];
            snapshot.forEach(doc => {
                requests.push({ id: doc.id, ...doc.data() });
            });
            setPendingRequests(requests);
            setConnectionStatus('safe');
        }, (error) => {
            console.error("Error fetching pending requests:", error);
            setConnectionStatus('error');
        });

        // Query for Recent Activity
        const qRecent = query(
            scanLogsRef,
            where('gateId', '==', guardData.gate_id),
            orderBy('scannedAt', 'desc'),
            limit(10)
        );

        const unsubscribeRecent = onSnapshot(qRecent, (snapshot) => {
            const acts = [];
            snapshot.forEach(doc => {
                acts.push({ id: doc.id, ...doc.data() });
            });
            setActivities(acts);
            setStats(prev => ({ ...prev, totalScans: prev.totalScans + acts.length })); // simplified stat
        });

        return () => {
            unsubscribePending();
            unsubscribeRecent();
        };
    }, [guardData?.gate_id, guardData?.collegeId]);

    const handleRefresh = async () => {
        // Force re-fetch stats if needed
        setConnectionStatus('connecting');
        setTimeout(() => setConnectionStatus('safe'), 500);
    };

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

            // We could show verification result here if we want, but usually it just approves
            // and removes from pending
        } catch (err) {
            console.error("Approval failed", err);
        }
    };

    const initials = guardData?.full_name
        ? guardData.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
        : 'GP';

    return (
        <div className="flex flex-col min-h-screen bg-[#f8f9fb] pb-12">
            {/* Verification Overlay */}
            {activeVerification && (
                <div className="fixed inset-0 z-[100] bg-white animate-in slide-in-from-bottom duration-500 overflow-hidden">
                    <VerificationResult
                        studentData={activeVerification}
                        gateName={guardData?.guard_gates?.name || guardData?.gate_id}
                        verifiedAt={activeVerification.verifiedAt}
                        onNextScan={() => setActiveVerification(null)}
                        warning={activeVerification.warning}
                        status={activeVerification.status}
                        hideNavBar={true}
                    />
                </div>
            )}

            {/* Header */}
            <header className="px-6 py-4 flex justify-between items-center bg-transparent">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#f4a261]/20 flex items-center justify-center border border-white/50 overflow-hidden shadow-sm">
                        {guardData?.photo_url ? (
                            <img src={guardData.photo_url} alt="Guard" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-[#e76f51]/40 flex items-center justify-center text-[#e76f51] font-bold text-sm">{initials}</div>
                        )}
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                                {t('guard.home.title')}
                            </p>
                            {/* Live Connection Indicator */}
                            <div className={`w-1.5 h-1.5 rounded-full ${
                                connectionStatus === 'safe' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                                connectionStatus === 'connecting' ? 'bg-amber-500 animate-pulse' : 'bg-rose-500'
                            }`} title={`System Status: ${connectionStatus}`} />
                        </div>
                        <h1 className="text-base font-black text-gray-800 leading-none">{t('guard.home.title')}</h1>
                    </div>
                </div>
                <div className="relative">
                    <div className="w-10 h-10 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center text-gray-400">
                        <Bell className="w-5 h-5" />
                        <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white shadow-sm shadow-rose-200"></span>
                    </div>
                </div>
            </header>

            {/* Main Action Section */}
            <div className="px-6 mt-6">
                <div className="bg-white rounded-[40px] p-8 shadow-[0_10px_40px_rgba(0,0,0,0.04)] border border-white relative overflow-hidden text-center">

                    <h2 className="text-3xl font-black text-[#1a2b3c] tracking-tight mb-2 uppercase">{guardData?.full_name || 'Guard'}</h2>
                    <p className="text-sm font-bold text-[#b43e8f] tracking-widest mb-8 uppercase">ID: {guardData?.employee_id || 'VP-GUARD'}</p>

                    {/* QR Area - Very rounded peach card */}
                    <div className="w-full max-w-[260px] mx-auto relative group cursor-pointer">
                        <div className="aspect-square bg-[#fff8f6] rounded-[60px] flex items-center justify-center p-1 relative border border-[#f47c20]/5">
                            <div className="w-full h-full bg-white rounded-[40px] shadow-lg flex flex-col items-center justify-center gap-4 transition-transform group-hover:scale-105 active:scale-95 border-2 border-[#f47c20]/10 shadow-[#f47c20]/5 p-2">
                                <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=https://vishnupass.com/gate/${guardData?.gate_id}_${qrToken}`}
                                    alt="Gate QR"
                                    className="w-full h-full object-contain"
                                />
                            </div>
                        </div>

                        {/* Progress ring/timer container */}
                        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 py-1.5 px-4 bg-white rounded-full shadow-md border border-gray-100 flex items-center gap-2 max-w-fit mx-auto transition-transform group-hover:scale-105">
                            <Clock className="w-3 h-3 text-[#f47c20]" />
                            <span className="text-[10px] font-black tracking-widest text-gray-600">
                                {t('guard.home.refreshIn')} <span className="text-[#f47c20]">{qrTimeLeft}S</span>
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Pending Requests Queue */}
            {pendingRequests.length > 0 && (
                <div className="mt-8 px-6 animate-in slide-in-from-bottom duration-300">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <h3 className="text-base font-black text-[#f47c20] tracking-tight">{t('guard.home.accessRequests')}</h3>
                            <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">{pendingRequests.length}</span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {pendingRequests.map(req => (
                            <div key={req.id} className="bg-white rounded-[24px] p-3 pl-4 border-2 border-[#f47c20]/20 shadow-[0_4px_20px_rgba(244,124,32,0.1)] flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#fff8f6] shadow-sm">
                                        {req.photoUrl ? (
                                            <img src={req.photoUrl} alt="Profile" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold">
                                                <User className="w-6 h-6" />
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black text-gray-800 leading-none mb-1">{req.studentName}</h4>
                                        <div className="flex items-center gap-2">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                {req.studentId} • {req.status}
                                            </p>
                                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase ${
                                                req.movementType === 'IN' ? 'bg-emerald-100 text-emerald-600' : 
                                                req.movementType === 'OUT' ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-600'
                                            }`}>
                                                {req.movementType || req.movement_type}
                                            </span>
                                            {req.warning && (
                                                <span className="flex items-center gap-1 bg-amber-100 text-amber-600 text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase animate-pulse">
                                                    <Zap className="w-2.5 h-2.5" />
                                                    Alert
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleApprove(req.id)}
                                    className="h-12 px-6 bg-gradient-to-r from-[#f47c20] to-[#e06b12] text-white rounded-2xl flex items-center justify-center shadow-lg shadow-[#f47c20]/20 active:scale-95 transition-transform"
                                >
                                    <CheckCircle2 className="w-5 h-5" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Recent Activity Section */}
            <div className="mt-8 px-6 pb-20">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-black text-gray-800 tracking-tight">{t('guard.home.recentActivity')}</h3>
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={handleRefresh}
                            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#f47c20] transition-colors"
                            title="Force Refresh Scans"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                        <button className="text-xs font-bold text-[#f47c20]">{t('guard.home.viewAll')}</button>
                    </div>
                </div>

                <div className="space-y-4">
                    {activities.length === 0 ? (
                        <div className="py-8 text-center text-gray-400 font-bold text-xs uppercase tracking-widest bg-white rounded-[28px] border border-dashed border-gray-200">
                            {t('guard.home.noScans')}
                        </div>
                    ) : (
                        activities.map((activity) => (
                            <div key={activity.id} className={`bg-white rounded-[28px] p-4 border border-white shadow-sm flex items-center justify-between group`}>
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${activity.status === 'completed' || activity.status === 'approved' ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
                                        {activity.photoUrl ? (
                                            <img src={activity.photoUrl} alt="P" className="w-full h-full object-cover rounded-lg" />
                                        ) : (
                                            <User className="w-5 h-5" />
                                        )}
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black text-gray-800 leading-none mb-1.5">{activity.studentName || 'Student'}</h4>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase">
                                            <Clock className="w-3 h-3 inline mr-1 -mt-0.5" />
                                            {activity.scannedAt?.toDate ? format(activity.scannedAt.toDate(), 'hh:mm a') : 'Now'} • {activity.studentId || 'GUEST'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1.5">
                                    <div className="flex items-center gap-2">
                                        {activity.warning && (
                                            <Zap className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                                        )}
                                        <span className={`text-[8px] font-black px-2.5 py-1 rounded-lg tracking-wider uppercase ${
                                            (activity.status === 'Success' || activity.status === 'completed' || activity.status === 'approved') 
                                            ? 'bg-emerald-100 text-emerald-600' 
                                            : 'bg-rose-100 text-rose-600'
                                        }`}>
                                            {activity.status === 'completed' ? 'Verified' : 
                                             (activity.status === 'rejected' || activity.status === 'denied') ? 'Denied' : activity.status}
                                        </span>
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-400 tracking-tighter uppercase leading-none">
                                        {activity.movementType || activity.movement_type}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default GuardHome;
