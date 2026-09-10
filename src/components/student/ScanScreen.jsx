import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Shield, Clock, Zap, Loader2, Fingerprint, Camera, ShieldCheck, X, LogIn, LogOut } from 'lucide-react';
import { supabase } from '../../config/supabase';
import { Scanner } from '@yudiel/react-qr-scanner';
import VerificationResult from './VerificationResult';

const ScanScreen = ({ studentData, onBack }) => {
    const [status, setStatus] = useState('idle'); // idle -> requesting (camera open) -> completed
    const [timeLeft, setTimeLeft] = useState(25);
    const [error, setError] = useState(null);
    const [movementType, setMovementType] = useState(null);
    const [gateData, setGateData] = useState(null);
    const [verifiedAt, setVerifiedAt] = useState(null);
    const [sessionWarning, setSessionWarning] = useState(null);
    const [isLimitReached, setIsLimitReached] = useState(false);

    const statusRef = useRef('idle');
    const movementTypeRef = useRef(null);
    const limitReachedRef = useRef(false);
    const scanLock = useRef(false);

    useEffect(() => {
        statusRef.current = status;
    }, [status]);

    // Countdown Timer logic
    useEffect(() => {
        let timer;
        if (status === 'requesting') {
            timer = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        setStatus('expired');
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [status]);

    const checkStudentPolicyLimit = async (type) => {
        try {
            if (!studentData?.student_id && !studentData?.id) {
                return { isLimitReached: false, warningText: null, totalUsed: 0, limitCount: 100 };
            }

            const studentIdentifier = studentData.student_id || studentData.id;

            // Fetch Policies
            const { data: policyData } = await supabase
                .from('portal_settings')
                .select('value')
                .eq('key', 'student_policies')
                .maybeSingle();

            let policies = policyData?.value;
            if (typeof policies === 'string') {
                try { policies = JSON.parse(policies); } catch (e) { policies = null; }
            }

            if (!policies) return { isLimitReached: false, warningText: null, totalUsed: 0, limitCount: 100 };

            const rawCategory = String(studentData.hostel_type || studentData.hostel || '').toLowerCase();
            const category = (rawCategory.includes('hostel') || rawCategory.includes('resident')) ? 'hosteler' : 'dayscholar';
            const categoryPolicy = policies[category] || policies[`${category}s`];

            if (!categoryPolicy) return { isLimitReached: false, warningText: null, totalUsed: 0, limitCount: 100 };

            const isOut = type === 'OUT';
            const limitCount = isOut
                ? parseInt(categoryPolicy.monthlyOutLimit ?? 100, 10)
                : parseInt(categoryPolicy.monthlyInLimit ?? 100, 10);

            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);
            const startOfMonthIso = startOfMonth.toISOString();

            const ids = Array.from(new Set([
                studentData.student_id,
                studentData.student_id?.toUpperCase(),
                studentData.student_id?.toLowerCase(),
                studentData.id
            ].filter(Boolean)));

            // 1. Query scan_sessions for current month completed scans
            let sQuery = supabase
                .from('scan_sessions')
                .select('id, movement_type, status, created_at')
                .gte('created_at', startOfMonthIso)
                .in('status', ['completed', 'approved', 'Success']);

            if (ids.length === 1) {
                sQuery = sQuery.eq('student_id', ids[0]);
            } else if (ids.length > 1) {
                sQuery = sQuery.in('student_id', ids);
            }

            const { data: scanSessions } = await sQuery;
            const matchingSessions = (scanSessions || []).filter(row => {
                const mType = String(row.movement_type || '').toUpperCase();
                return isOut
                    ? (mType.includes('OUT') || mType.includes('EXIT'))
                    : (mType.includes('IN') || mType.includes('ENTRY'));
            });

            // 2. Query movement_logs for current month completed scans
            let mQuery = supabase
                .from('movement_logs')
                .select('id, movement_type, status, created_at')
                .gte('created_at', startOfMonthIso)
                .in('status', ['completed', 'approved', 'Success']);

            if (ids.length === 1) {
                mQuery = mQuery.eq('student_id', ids[0]);
            } else if (ids.length > 1) {
                mQuery = mQuery.in('student_id', ids);
            }

            const { data: movementLogs } = await mQuery;
            const matchingMovementLogs = (movementLogs || []).filter(row => {
                const mType = String(row.movement_type || '').toUpperCase();
                return isOut
                    ? (mType.includes('OUT') || mType.includes('EXIT'))
                    : (mType.includes('IN') || mType.includes('ENTRY'));
            });

            // Combine sessions and movement logs, deduplicating scans within the same 60-second window
            const allScans = [
                ...matchingSessions.map(s => ({ time: new Date(s.created_at).getTime(), id: s.id })),
                ...matchingMovementLogs.map(m => ({ time: new Date(m.created_at).getTime(), id: m.id }))
            ];
            const uniqueScans = [];
            allScans.sort((a, b) => a.time - b.time).forEach(scan => {
                const isDuplicate = uniqueScans.some(u => Math.abs(u.time - scan.time) < 60000);
                if (!isDuplicate) {
                    uniqueScans.push(scan);
                }
            });

            const totalUsed = Math.max(uniqueScans.length, matchingSessions.length, matchingMovementLogs.length);
            const isLimitReached = totalUsed >= limitCount;
            const warningText = isLimitReached
                ? `Monthly ${type} pass limit of ${limitCount} reached (${totalUsed}/${limitCount}). Additional passes cannot be issued.`
                : null;

            return { isLimitReached, warningText, totalUsed, limitCount };
        } catch (e) {
            console.warn("Policy limit check error:", e);
            return { isLimitReached: false, warningText: null, totalUsed: 0, limitCount: 100 };
        }
    };

    const handleRequestAccess = async (type) => {
        setError(null);
        setMovementType(type);
        movementTypeRef.current = type;
        
        try {
            if (!studentData?.student_id && !studentData?.id) {
                throw new Error("Student data missing. Please re-login.");
            }

            // Verify monthly limits from database
            const limitCheck = await checkStudentPolicyLimit(type);
            setIsLimitReached(limitCheck.isLimitReached);
            limitReachedRef.current = limitCheck.isLimitReached;
            setSessionWarning(limitCheck.warningText);

            if (limitCheck.isLimitReached) {
                setError(limitCheck.warningText);
                return;
            }

            setStatus('requesting');
            setTimeLeft(25);

        } catch (err) {
            setError(`Request Failed: ${err.message || 'Please try again.'}`);
            setStatus('idle');
        }
    };

    const handleScan = async (result) => {
        if (!result || scanLock.current) return;

        const currentStatus = statusRef.current;
        if (currentStatus !== 'requesting') return;

        let rawValue = typeof result === 'string' ? result : (result[0]?.rawValue || result?.text || result?.rawValue);
        if (!rawValue) return;

        try {
            scanLock.current = true;
            setStatus('processing_scan');

            let scannedGateId = null;
            if (rawValue.includes('/gate/')) {
                const dataPart = rawValue.split('/gate/').pop();
                scannedGateId = dataPart.split('_')[0].trim();
            } else {
                scannedGateId = rawValue.split('_')[0].trim();
            }

            // Fetch gate name safely
            let gateName = 'Main Campus Gate';
            let finalGateId = null;
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(scannedGateId);
            try {
                let query = supabase.from('guard_gates').select('id, name');
                if (isUuid) {
                    query = query.eq('id', scannedGateId);
                } else {
                    const cleanGateStr = scannedGateId.replace(/_/g, ' ').replace(/-/g, ' ');
                    query = query.ilike('name', `%${cleanGateStr}%`);
                }
                const { data: gateRow } = await query.maybeSingle();

                if (gateRow?.name) {
                    gateName = gateRow.name;
                    finalGateId = gateRow.id;
                } else if (!isUuid && scannedGateId) {
                    gateName = scannedGateId.replace(/_/g, ' ').replace(/-/g, ' ');
                }
            } catch (e) {
                console.warn("Gate fetch error", e);
            }

            const formattedGateName = gateName ? gateName.replace(/\b\w/g, c => c.toUpperCase()) : 'Main Campus Gate';
            setGateData({ id: finalGateId, name: formattedGateName });

            // Re-verify limit right before recording scan
            const limitCheck = await checkStudentPolicyLimit(movementTypeRef.current || 'IN');
            const limitReached = limitCheck.isLimitReached || limitReachedRef.current;
            setIsLimitReached(limitReached);
            limitReachedRef.current = limitReached;
            const warningText = limitCheck.warningText || sessionWarning;
            setSessionWarning(warningText);

            const newStatus = limitReached ? 'rejected' : 'completed';
            const resolvedAccessPointId = finalGateId || (isUuid ? scannedGateId : null);
            const studentIdentifier = studentData.student_id || studentData.id;

            // Direct INSERT into Supabase scan_sessions (Students have INSERT permissions)
            try {
                await supabase
                    .from('scan_sessions')
                    .insert([{
                        student_id: studentIdentifier,
                        gate_id: isUuid ? resolvedAccessPointId : null,
                        status: newStatus,
                        movement_type: movementTypeRef.current || 'IN',
                        warning: warningText || null
                    }]);
            } catch (sErr) {
                console.warn("scan_sessions insert error:", sErr);
            }

            // Also attempt to insert directly into movement_logs if completed
            if (newStatus === 'completed') {
                try {
                    await supabase.from('movement_logs').insert([{
                        user_name: studentData.full_name,
                        student_id: studentIdentifier,
                        movement_type: movementTypeRef.current || 'IN',
                        status: 'Success',
                        access_point_id: isUuid ? resolvedAccessPointId : null
                    }]);
                } catch (mErr) {
                    console.warn("Direct movement_logs insert info:", mErr);
                }
            }
            
            setVerifiedAt(new Date().toISOString());
            setStatus('completed');

        } catch (err) {
            console.error("Verification error:", err);
            setError(err?.message || "Verification failed");
            setStatus('requesting');
        } finally {
            scanLock.current = false;
        }
    };

    if (status === 'completed') {
        return (
            <VerificationResult 
                studentData={studentData}
                gateName={gateData?.name || 'Main Campus Gate'}
                verifiedAt={verifiedAt}
                onNextScan={onBack}
                warning={sessionWarning}
                status={isLimitReached ? 'rejected' : 'completed'}
                hideNavBar={true}
            />
        );
    }

    const initials = studentData?.full_name
        ? studentData.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
        : 'ST';

    return (
        <div className="flex-1 flex flex-col bg-[#f8f9fb] overflow-hidden relative font-sans min-h-screen">
            {/* Header */}
            <header className="px-6 py-10 flex justify-between items-center relative z-20">
                <button
                    onClick={onBack}
                    className="w-12 h-12 rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-50 transition-all shadow-sm active:scale-95"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <div className="px-8 py-3 rounded-full bg-white border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] text-gray-900 font-black text-[12px] tracking-[0.2em] uppercase">
                    {status === 'idle' ? 'Access Request' : 'Scanner Active'}
                </div>
                <div className="w-12 h-12 relative">
                    <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center border border-gray-100 overflow-hidden shadow-sm">
                        {studentData?.photo_url ? (
                            <img src={studentData.photo_url} alt="Student" className="w-full h-full object-cover" />
                        ) : (
                            <div className="text-gray-400 font-bold text-sm">{initials}</div>
                        )}
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-30 pb-20">
                <div className="w-full bg-white rounded-[40px] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-gray-50 relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#f47c20] to-[#e06b12]" />

                    {status === 'idle' || status === 'expired' ? (
                        <div className="flex flex-col items-center text-center">
                            <div className="w-24 h-24 rounded-[32px] bg-orange-50 flex items-center justify-center mb-6">
                                <Fingerprint className="w-12 h-12 text-[#f47c20]" />
                            </div>
                            <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-tight mb-2">
                                Access Control
                            </h2>
                            <p className="text-sm font-bold text-gray-500 mb-8 leading-relaxed max-w-[240px]">
                                Tap to start. Camera will open immediately to scan the Gate QR.
                            </p>

                            {error && (
                                <p className="text-rose-600 font-bold text-xs mb-6 px-4 py-2 bg-rose-50 rounded-xl border border-rose-100">
                                    {error}
                                </p>
                            )}

                            {status === 'expired' && (
                                <p className="text-rose-600 font-bold text-xs mb-6 px-4 py-2 bg-rose-50 rounded-xl border border-rose-100">
                                    Request expired. Please try again.
                                </p>
                            )}

                            <div className="flex flex-col gap-3 w-full">
                                <button
                                    onClick={() => handleRequestAccess('IN')}
                                    className="w-full py-5 bg-[#f47c20] hover:bg-[#e06d1c] text-white font-black rounded-2xl shadow-xl shadow-orange-500/20 flex items-center justify-center gap-3 active:scale-[0.98] transition-all text-sm tracking-[0.2em] uppercase"
                                >
                                    <LogIn className="w-5 h-5" />
                                    Request Entry
                                </button>
                                <button
                                    onClick={() => handleRequestAccess('OUT')}
                                    className="w-full py-5 bg-white border-2 border-gray-100 text-gray-900 font-black rounded-2xl flex items-center justify-center gap-3 active:scale-[0.98] transition-all text-sm tracking-[0.2em] uppercase hover:bg-gray-50 hover:border-gray-200"
                                >
                                    <LogOut className="w-5 h-5 text-[#f47c20]" />
                                    Request Exit
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center text-center">
                            {/* Status Indicator */}
                            <div className={`flex items-center gap-2 mb-4 px-4 py-2 rounded-xl border ${
                                status === 'approved' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                            }`}>
                                {status === 'approved' ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <ShieldCheck className="w-4 h-4" />
                                )}
                                <span className="text-xs font-black uppercase tracking-wider">
                                    {status === 'approved' ? 'Awaiting Guard Signal' : 'Scanner Ready'}
                                </span>
                            </div>

                            {error && (
                                <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-xl w-full">
                                    <p className="text-xs font-bold text-red-600 break-words">{error}</p>
                                </div>
                            )}

                            <div className="w-full aspect-square relative rounded-[32px] overflow-hidden border-2 border-[#f47c20]/20 shadow-xl mb-6 bg-gray-900">
                                <div className={`absolute inset-0 border-4 transition-colors duration-300 z-30 pointer-events-none ${
                                    status === 'approved' ? 'border-amber-500/30' : 'border-emerald-500/30'
                                }`} />
                                <div className="absolute top-6 left-6 w-8 h-8 border-t-4 border-l-4 border-[#f47c20] rounded-tl-2xl z-20" />
                                <div className="absolute top-6 right-6 w-8 h-8 border-t-4 border-r-4 border-[#f47c20] rounded-tr-2xl z-20" />
                                <div className="absolute bottom-6 left-6 w-8 h-8 border-b-4 border-l-4 border-[#f47c20] rounded-bl-2xl z-20" />
                                <div className="absolute bottom-6 right-6 w-8 h-8 border-b-4 border-r-4 border-[#f47c20] rounded-br-2xl z-20" />
                                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#f47c20] to-transparent z-20 animate-[scan_3s_ease-in-out_infinite]" />

                                <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
                                    <div className="flex flex-col items-center gap-3">
                                        <Loader2 className="w-8 h-8 text-[#f47c20] animate-spin opacity-50" />
                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Initialising Opticals...</p>
                                    </div>
                                </div>

                                <Scanner
                                    onScan={handleScan}
                                    onError={(err) => {
                                        const msg = typeof err === 'string' ? err : err?.message || 'Permission denied or not found';
                                        setError(`Camera error: ${msg}`);
                                    }}
                                    constraints={{
                                        facingMode: "environment"
                                    }}
                                    components={{ tracker: false, finder: false, audio: true, torch: true }}
                                    styles={{
                                        container: { width: '100%', height: '100%', background: 'black', position: 'relative', zIndex: 20 },
                                        video: { objectFit: 'cover', width: '100%', height: '100%' },
                                    }}
                                />

                                {(status === 'processing_scan' || status === 'approved') && (
                                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center text-gray-900 gap-4">
                                        <Loader2 className="w-10 h-10 text-[#f47c20] animate-spin" />
                                        <p className="text-xs font-black tracking-[0.2em] uppercase">
                                            {status === 'approved' ? 'Waiting for Guard' : 'Verifying Gate...'}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <p className="text-xs font-bold text-gray-400 mb-6 tracking-wide uppercase">
                                {status === 'approved' ? "Please wait for synchronization" : "Align Gateway QR within the frame"}
                            </p>

                            <div className="flex items-center justify-between w-full px-2">
                                <button
                                    onClick={() => setStatus('idle')}
                                    className="px-6 py-3 bg-gray-50 text-gray-500 font-bold rounded-2xl active:scale-95 transition-all text-[10px] tracking-[0.1em] uppercase border border-gray-100"
                                >
                                    Cancel
                                </button>
                                <div className="flex items-center gap-2 font-black text-xl text-gray-900 font-mono">
                                    <Clock className="w-5 h-5 text-[#f47c20]" />
                                    00:{timeLeft.toString().padStart(2, '0')}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                .font-sans { font-family: 'Outfit', 'Inter', sans-serif; }
                @keyframes scan {
                    0%, 100% { top: 10%; opacity: 0.2; }
                    50% { top: 90%; opacity: 0.9; }
                }
            `}</style>
        </div>
    );
};

export default ScanScreen;
