import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
    Bell, TrendingUp, Clock, ShieldCheck, User, QrCode, 
    CheckCircle2, Zap, RefreshCw, Ticket, ArrowRight, Search, 
    X, Loader2, Sparkles, PlusCircle, Check, Users, UserPlus, 
    GraduationCap, Phone, Car, FileText, Building2, UserCheck,
    Copy, Share2, ExternalLink
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useLanguage } from '../../contexts/LanguageContext';
import { format } from 'date-fns';
import { supabase } from '../../config/supabase';
import { fetchCombinedMovementLogs } from '../../lib/functions';
import VerificationResult from '../student/VerificationResult';

const GuardHome = ({ guardData }) => {
    const { t } = useLanguage();
    const [stats, setStats] = useState({ totalScans: 0, activePasses: 0 });
    const [activities, setActivities] = useState([]);
    const [activeVerification, setActiveVerification] = useState(null);
    const [qrToken, setQrToken] = useState(crypto.randomUUID ? crypto.randomUUID() : `qr_${Date.now()}`);
    const [qrTimeLeft, setQrTimeLeft] = useState(25);
    const [connectionStatus, setConnectionStatus] = useState('safe');

    // Generate Pass Modal State (For Outer Parents & New Joining Members)
    const [isGeneratePassOpen, setIsGeneratePassOpen] = useState(false);
    const [passCategory, setPassCategory] = useState('PARENT'); // 'PARENT' | 'NEW_JOINING'
    const [passMovementType, setPassMovementType] = useState('IN');

    // Parent / Visitor fields
    const [visitorName, setVisitorName] = useState('');
    const [visitorPhone, setVisitorPhone] = useState('');
    const [visitingStudentRoll, setVisitingStudentRoll] = useState('');
    const [visitorPurpose, setVisitorPurpose] = useState('Parent Meeting / Ward Visit');
    const [customVisitorPurpose, setCustomVisitorPurpose] = useState('');
    const [visitorCount, setVisitorCount] = useState('1');
    const [visitorVehicle, setVisitorVehicle] = useState('');

    // New Joining Member / Admission fields
    const [joinerName, setJoinerName] = useState('');
    const [joinerPhone, setJoinerPhone] = useState('');
    const [applicationNo, setApplicationNo] = useState('');
    const [joinerDept, setJoinerDept] = useState('Artificial Intelligence and Data Science (AI&DS)');
    const [joinerPurpose, setJoinerPurpose] = useState('New Admission / Reporting');
    const [customJoinerPurpose, setCustomJoinerPurpose] = useState('');
    const [joinerCount, setJoinerCount] = useState('1');

    // Ward Student Search state (when parent visits a student)
    const [searchedStudent, setSearchedStudent] = useState(null);
    const [searchingStudent, setSearchingStudent] = useState(false);
    const [generatingPass, setGeneratingPass] = useState(false);
    const [generateError, setGenerateError] = useState(null);

    // Generated Visitor Pass QR Screen state
    const [visitorQrModal, setVisitorQrModal] = useState(null);
    const [copiedUrl, setCopiedUrl] = useState(false);

    const isUuid = (val) => typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

    // Human-friendly gate name resolution (Prevents displaying raw UUIDs)
    const [resolvedGateName, setResolvedGateName] = useState(() => {
        if (guardData?.guard_gates?.name) return guardData.guard_gates.name;
        if (guardData?.gate_name) return guardData.gate_name;
        if (guardData?.gate_id && !isUuid(guardData.gate_id)) return guardData.gate_id;
        return 'Main Campus Gate';
    });

    useEffect(() => {
        const resolveGate = async () => {
            if (guardData?.guard_gates?.name) {
                setResolvedGateName(guardData.guard_gates.name);
                return;
            }
            if (guardData?.gate_name) {
                setResolvedGateName(guardData.gate_name);
                return;
            }
            if (guardData?.gate_id) {
                if (!isUuid(guardData.gate_id)) {
                    setResolvedGateName(guardData.gate_id);
                    return;
                }
                try {
                    const { data } = await supabase
                        .from('guard_gates')
                        .select('name')
                        .eq('id', guardData.gate_id)
                        .maybeSingle();
                    if (data?.name) {
                        setResolvedGateName(data.name);
                        return;
                    }
                } catch (e) {
                    console.warn("Gate lookup error:", e);
                }
            }
            setResolvedGateName('Main Campus Gate');
        };
        resolveGate();
    }, [guardData]);

    // Live student search for parent visiting a specific student
    const handleSearchWard = async (query) => {
        const q = query.trim();
        if (!q) {
            setSearchedStudent(null);
            return;
        }
        setSearchingStudent(true);
        try {
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(q);
            let req = supabase.from('students').select('*, departments(name)');
            if (isUuid) {
                req = req.or(`id.eq.${q},student_id.eq.${q}`);
            } else {
                req = req.or(`student_id.eq.${q},student_id.ilike.${q}`);
            }
            const { data } = await req.maybeSingle();
            if (data) {
                setSearchedStudent(data);
            } else {
                const { data: byName } = await supabase
                    .from('students')
                    .select('*, departments(name)')
                    .or(`full_name.ilike.${q},email.ilike.${q}`)
                    .maybeSingle();
                setSearchedStudent(byName || null);
            }
        } catch (e) {
            console.warn("Ward student lookup error:", e);
        } finally {
            setSearchingStudent(false);
        }
    };

    const handleGeneratePassSubmit = async (e) => {
        if (e) e.preventDefault();
        setGenerateError(null);

        if (passCategory === 'PARENT') {
            if (!visitorName.trim()) {
                setGenerateError("Please enter the Visitor / Parent Full Name");
                return;
            }
            if (!visitorPhone.trim() || visitorPhone.trim().length < 6) {
                setGenerateError("Please enter a valid Contact / Mobile Number");
                return;
            }
        } else {
            if (!joinerName.trim()) {
                setGenerateError("Please enter Candidate / Joining Member Full Name");
                return;
            }
            if (!joinerPhone.trim() || joinerPhone.trim().length < 6) {
                setGenerateError("Please enter a valid Contact / Mobile Number");
                return;
            }
        }

        setGeneratingPass(true);

        try {
            const finalPurpose = passCategory === 'PARENT'
                ? (visitorPurpose === 'Other' ? customVisitorPurpose || 'Campus Visit' : visitorPurpose)
                : (joinerPurpose === 'Other' ? customJoinerPurpose || 'Admission Inquiry' : joinerPurpose);

            const displayName = passCategory === 'PARENT' ? visitorName.trim() : joinerName.trim();
            const contactPhone = passCategory === 'PARENT' ? visitorPhone.trim() : joinerPhone.trim();

            const passId = passCategory === 'PARENT'
                ? (visitingStudentRoll.trim() ? `PRNT-${visitingStudentRoll.trim().toUpperCase()}` : `VIS-${contactPhone.slice(-4) || 'PASS'}`)
                : (applicationNo.trim() ? `ADM-${applicationNo.trim().toUpperCase()}` : `JOIN-${contactPhone.slice(-4) || 'PASS'}`);

            const gateDisplayName = resolvedGateName || guardData?.guard_gates?.name || guardData?.gate_name || 'Main Campus Gate';

            // 1. Insert into movement_logs
            await supabase.from('movement_logs').insert([{
                user_name: `${passCategory === 'PARENT' ? '[Visitor/Parent]' : '[New Joining]'} ${displayName}`,
                student_id: passId,
                movement_type: passMovementType,
                status: 'Success',
                access_point_id: isUuid(guardData?.gate_id) ? guardData.gate_id : null
            }]);

            // 2. Build full pass metadata payload
            const passData = passCategory === 'PARENT' ? {
                isVisitorPass: true,
                passCategory: 'PARENT',
                passTitle: 'Outer Parent / Visitor Gate Pass',
                full_name: displayName,
                student_id: passId,
                contact_number: contactPhone,
                visiting_student: searchedStudent ? `${searchedStudent.full_name} (${searchedStudent.student_id})` : visitingStudentRoll.trim() || 'Campus Official / Faculty',
                purpose: finalPurpose,
                persons_count: visitorCount,
                vehicle_no: visitorVehicle.trim() || 'None',
                departments: searchedStudent?.departments || { name: 'Parent / Campus Visitor' },
                hostel_type: 'Outer Parent / Visitor',
                campus: 'Main Campus',
                gateName: gateDisplayName,
                status: 'completed',
                verifiedAt: new Date().toISOString()
            } : {
                isVisitorPass: true,
                passCategory: 'NEW_JOINING',
                passTitle: 'New Admission / Joining Entry Pass',
                full_name: displayName,
                student_id: passId,
                contact_number: contactPhone,
                application_no: applicationNo.trim() || 'N/A',
                purpose: finalPurpose,
                departments: { name: joinerDept },
                persons_count: joinerCount,
                hostel_type: 'New Joining Member',
                campus: 'Main Campus',
                gateName: gateDisplayName,
                status: 'completed',
                verifiedAt: new Date().toISOString()
            };

            // Encode pass URL for QR scanning
            const payloadEncoded = btoa(unescape(encodeURIComponent(JSON.stringify(passData))));
            const passUrl = `${window.location.origin}/visitor-pass?id=${encodeURIComponent(passId)}&data=${encodeURIComponent(payloadEncoded)}`;

            const fullPassWithUrl = {
                ...passData,
                passUrl
            };

            // 3. Show the Visitor QR Code Presentation Modal immediately
            setVisitorQrModal({
                passData: fullPassWithUrl,
                passUrl
            });

            // 4. Reset form fields and close input modal
            setIsGeneratePassOpen(false);
            setVisitorName('');
            setVisitorPhone('');
            setVisitingStudentRoll('');
            setSearchedStudent(null);
            setVisitorVehicle('');
            setCustomVisitorPurpose('');
            setJoinerName('');
            setJoinerPhone('');
            setApplicationNo('');
            setCustomJoinerPurpose('');
            fetchStatsAndRequests();
        } catch (err) {
            console.error("Pass generation error:", err);
            setGenerateError(err.message || "Failed to generate pass");
        } finally {
            setGeneratingPass(false);
        }
    };

    // Click handler for Recent Activity item
    const handleActivityClick = async (activity) => {
        if (!activity) return;
        const sId = activity.student_id || activity.studentId || activity.user_name;
        const uName = activity.user_name || activity.studentName || '';
        const actGateName = activity.guard_gates?.name 
            ? activity.guard_gates.name.replace(/\b\w/g, c => c.toUpperCase()) 
            : (resolvedGateName || 'Main Campus Gate');

        // Check if this log was a visitor/parent or new joining pass
        if (uName.includes('[Visitor/Parent]') || sId?.startsWith('PRNT-') || sId?.startsWith('VIS-')) {
            const cleanName = uName.replace('[Visitor/Parent]', '').trim() || 'Parent / Visitor';
            setActiveVerification({
                isVisitorPass: true,
                passCategory: 'PARENT',
                passTitle: 'Outer Parent / Visitor Gate Pass',
                full_name: cleanName,
                student_id: sId || 'VISITOR-PASS',
                contact_number: 'Provided at Gate',
                visiting_student: sId?.startsWith('PRNT-') ? sId.replace('PRNT-', '') : 'Campus Visitor',
                purpose: 'Campus / Ward Visit',
                departments: { name: 'Parent / Campus Visitor' },
                hostel_type: 'Outer Parent / Visitor',
                status: activity.status || 'Success',
                gateName: actGateName,
                verifiedAt: activity.created_at ? new Date(activity.created_at).toISOString() : new Date().toISOString()
            });
            return;
        }

        if (uName.includes('[New Joining]') || sId?.startsWith('ADM-') || sId?.startsWith('JOIN-') || sId?.startsWith('NEW-')) {
            const cleanName = uName.replace('[New Joining]', '').trim() || 'New Joining Member';
            setActiveVerification({
                isVisitorPass: true,
                passCategory: 'NEW_JOINING',
                passTitle: 'New Admission / Joining Entry Pass',
                full_name: cleanName,
                student_id: sId || 'NEW-JOINER',
                contact_number: 'Provided at Gate',
                purpose: 'New Admission / Reporting',
                departments: { name: 'New Joining Candidate' },
                hostel_type: 'New Joining Member',
                status: activity.status || 'Success',
                gateName: actGateName,
                verifiedAt: activity.created_at ? new Date(activity.created_at).toISOString() : new Date().toISOString()
            });
            return;
        }

        try {
            let studentData = null;
            if (sId) {
                const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sId);
                let query = supabase.from('students').select('*, departments(id, name)');
                if (isUuid) {
                    query = query.or(`id.eq.${sId},student_id.eq.${sId}`);
                } else {
                    query = query.or(`student_id.eq.${sId},student_id.ilike.${sId}`);
                }
                const { data } = await query.maybeSingle();
                studentData = data;
            }

            let deptName = studentData?.departments?.name || studentData?.department || studentData?.department_name;
            if (!deptName && studentData?.department_id) {
                try {
                    const { data: deptRow } = await supabase.from('departments').select('name').eq('id', studentData.department_id).maybeSingle();
                    if (deptRow?.name) deptName = deptRow.name;
                } catch (e) {
                    console.warn("Department lookup error:", e);
                }
            }

            setActiveVerification({
                ...(studentData || {
                    full_name: activity.user_name || activity.studentName || 'Student',
                    student_id: sId || '24pa1a45b4',
                }),
                departments: deptName ? { name: deptName } : (studentData?.departments || { name: 'Engineering' }),
                department: deptName || studentData?.department || 'Engineering',
                status: activity.status || 'Success',
                gateName: actGateName,
                verifiedAt: activity.created_at ? new Date(activity.created_at).toISOString() : new Date().toISOString()
            });
        } catch (err) {
            console.error("Error loading activity verification:", err);
        }
    };

    // QR Code Refresh Timer
    useEffect(() => {
        const timer = setInterval(() => {
            setQrTimeLeft((prev) => {
                if (prev <= 1) {
                    setQrToken(crypto.randomUUID ? crypto.randomUUID() : `qr_${Date.now()}`);
                    return 25;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const fetchStatsAndRequests = async () => {
        try {
            // Total Scans & Recent Verified Activities from combined logs
            const combinedLogs = await fetchCombinedMovementLogs({ limit: 10 });

            if (combinedLogs) {
                setActivities(combinedLogs);
                setStats(prev => ({ ...prev, totalScans: combinedLogs.length }));
            }

            setConnectionStatus('safe');
        } catch (e) {
            console.error('Error fetching guard data:', e);
            setConnectionStatus('error');
        }
    };

    // Real-time data fetching and subscriptions
    useEffect(() => {
        fetchStatsAndRequests();

        const channel = supabase
            .channel('guard-home-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'movement_logs' }, () => {
                fetchStatsAndRequests();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'scan_sessions' }, () => {
                fetchStatsAndRequests();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [guardData]);

    const handleRefresh = async () => {
        setConnectionStatus('connecting');
        await fetchStatsAndRequests();
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
                        gateName={activeVerification.gateName || resolvedGateName || guardData?.guard_gates?.name || guardData?.gate_name || 'Main Campus Gate'}
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

            {/* Main Action Section (QR Code Card) */}
            <div className="px-6 mt-6">
                <div className="bg-white rounded-[40px] p-8 shadow-[0_10px_40px_rgba(0,0,0,0.04)] border border-white relative overflow-hidden text-center">

                    <h2 className="text-3xl font-black text-[#1a2b3c] tracking-tight mb-2 uppercase">{guardData?.full_name || 'Guard'}</h2>
                    <p className="text-sm font-bold text-[#b43e8f] tracking-widest mb-8 uppercase">ID: {guardData?.employee_id || 'VP-GUARD'}</p>

                    {/* QR Area - Very rounded peach card */}
                    <div className="w-full max-w-[260px] mx-auto relative group cursor-pointer">
                        <div className="aspect-square bg-[#fff8f6] rounded-[60px] flex items-center justify-center p-1 relative border border-[#f47c20]/5">
                            <div className="w-full h-full bg-white rounded-[40px] shadow-lg flex flex-col items-center justify-center gap-4 transition-transform group-hover:scale-105 active:scale-95 border-2 border-[#f47c20]/10 shadow-[#f47c20]/5 p-2">
                                <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=https://gatepass.com/gate/${guardData?.gate_id}_${qrToken}`}
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

            {/* Generate Visitor / Guest Pass Card */}
            <div className="px-6 mt-6">
                <div 
                    onClick={() => {
                        setIsGeneratePassOpen(true);
                        setGenerateError(null);
                    }}
                    className="bg-gradient-to-r from-[#f47c20] via-[#e76f51] to-[#d95d39] rounded-[32px] p-5 text-white shadow-[0_10px_30px_rgba(244,124,32,0.25)] flex items-center justify-between cursor-pointer hover:shadow-[0_14px_35px_rgba(244,124,32,0.35)] active:scale-[0.98] transition-all group relative overflow-hidden"
                >
                    {/* Decorative elements */}
                    <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-white/15 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
                    <div className="absolute left-1/4 top-0 w-20 h-20 bg-white/10 rounded-full blur-lg pointer-events-none" />

                    <div className="flex items-center gap-4 relative z-10">
                        <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center flex-shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                            <Ticket className="w-7 h-7 text-white" />
                        </div>
                        <div className="text-left">
                            <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] bg-white/25 px-2 py-0.5 rounded-full">
                                    Visitor / Guest Pass
                                </span>
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                            </div>
                            <h3 className="text-lg font-black tracking-tight leading-tight">Generate Visitor Pass</h3>
                            <p className="text-xs text-white/85 font-medium">For outer parents, visitors & new joining members</p>
                        </div>
                    </div>

                    <div className="w-11 h-11 rounded-2xl bg-white text-[#f47c20] flex items-center justify-center shadow-md group-hover:translate-x-1.5 transition-transform relative z-10 flex-shrink-0">
                        <ArrowRight className="w-5 h-5" />
                    </div>
                </div>
            </div>

            {/* Recent Activity Section */}
            <div className="mt-8 px-6 pb-20">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-black text-gray-800 tracking-tight">{t('guard.home.recentActivity')}</h3>
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={handleRefresh}
                            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#f47c20] transition-colors cursor-pointer"
                            title="Force Refresh Scans"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                        <button className="text-xs font-bold text-[#f47c20] cursor-pointer">{t('guard.home.viewAll')}</button>
                    </div>
                </div>

                <div className="space-y-4">
                    {activities.length === 0 ? (
                        <div className="py-8 text-center text-gray-400 font-bold text-xs uppercase tracking-widest bg-white rounded-[28px] border border-dashed border-gray-200">
                            {t('guard.home.noScans')}
                        </div>
                    ) : (
                        activities.map((activity) => (
                            <div 
                                key={activity.id} 
                                onClick={() => handleActivityClick(activity)}
                                className={`bg-white rounded-[28px] p-4 border border-white shadow-sm flex items-center justify-between group cursor-pointer hover:bg-orange-50/30 transition-all active:scale-[0.99]`}
                                title="Click to view pass card"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${activity.status === 'completed' || activity.status === 'approved' || activity.status === 'Success' ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
                                        {activity.photoUrl ? (
                                            <img src={activity.photoUrl} alt="P" className="w-full h-full object-cover rounded-lg" />
                                        ) : (
                                            <User className="w-5 h-5" />
                                        )}
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black text-gray-800 leading-none mb-1.5 group-hover:text-[#f47c20] transition-colors">{activity.studentName || activity.user_name || 'Student'}</h4>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase">
                                            <Clock className="w-3 h-3 inline mr-1 -mt-0.5" />
                                            {activity.scannedAt?.toDate ? format(activity.scannedAt.toDate(), 'hh:mm a') : activity.created_at ? format(new Date(activity.created_at), 'hh:mm a') : 'Now'} • {activity.studentId || activity.student_id || 'GUEST'}
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
                                             (activity.status === 'rejected' || activity.status === 'denied') ? 'Denied' : activity.status || 'Verified'}
                                        </span>
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-400 tracking-tighter uppercase leading-none">
                                        {activity.movementType || activity.movement_type || 'IN'}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Generate Pass Modal (Outer Parents & New Joining Members) */}
            {isGeneratePassOpen && (
                <div 
                    className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto"
                    onClick={() => setIsGeneratePassOpen(false)}
                >
                    <div 
                        className="bg-white rounded-[36px] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 my-6 max-h-[90vh] flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="p-6 bg-gradient-to-r from-[#f47c20] to-[#e76f51] text-white flex items-center justify-between flex-shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                                    <Ticket className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black tracking-tight leading-tight">Generate Gate Pass</h3>
                                    <p className="text-xs text-white/80 font-medium">Issue pass for outer parents or new joining members</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsGeneratePassOpen(false)}
                                className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Category Selector Tabs */}
                        <div className="p-4 bg-gray-50 border-b border-gray-100 flex-shrink-0">
                            <div className="grid grid-cols-2 p-1 bg-white rounded-2xl border border-gray-200 shadow-sm">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setPassCategory('PARENT');
                                        setGenerateError(null);
                                    }}
                                    className={`py-3 px-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                        passCategory === 'PARENT'
                                            ? 'bg-[#f47c20] text-white shadow-md shadow-orange-500/20'
                                            : 'text-gray-500 hover:text-gray-900'
                                    }`}
                                >
                                    <Users className="w-4 h-4" />
                                    <span>Outer Parent / Visitor</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setPassCategory('NEW_JOINING');
                                        setGenerateError(null);
                                    }}
                                    className={`py-3 px-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                        passCategory === 'NEW_JOINING'
                                            ? 'bg-[#1a2b3c] text-white shadow-md shadow-slate-800/20'
                                            : 'text-gray-500 hover:text-gray-900'
                                    }`}
                                >
                                    <GraduationCap className="w-4 h-4" />
                                    <span>New Joining Member</span>
                                </button>
                            </div>
                        </div>

                        {/* Modal Form */}
                        <form onSubmit={handleGeneratePassSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
                            {/* CATEGORY 1: PARENT / VISITOR FORM */}
                            {passCategory === 'PARENT' && (
                                <>
                                    {/* Visitor Full Name */}
                                    <div>
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">
                                            Parent / Visitor Full Name <span className="text-rose-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <UserCheck className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                            <input 
                                                type="text"
                                                required
                                                placeholder="e.g. Ramesh Kumar (Parent/Guardian)"
                                                value={visitorName}
                                                onChange={(e) => setVisitorName(e.target.value)}
                                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-semibold text-gray-900 focus:outline-none focus:border-[#f47c20] focus:bg-white transition-all shadow-inner"
                                            />
                                        </div>
                                    </div>

                                    {/* Visitor Phone Number */}
                                    <div>
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">
                                            Mobile / Contact Number <span className="text-rose-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                            <input 
                                                type="tel"
                                                required
                                                placeholder="e.g. 9876543210"
                                                value={visitorPhone}
                                                onChange={(e) => setVisitorPhone(e.target.value)}
                                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-semibold text-gray-900 focus:outline-none focus:border-[#f47c20] focus:bg-white transition-all shadow-inner"
                                            />
                                        </div>
                                    </div>

                                    {/* Visiting Student ID / Roll Number (Optional Live Search) */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                                                Visiting Student Roll No. / Ward ID
                                            </label>
                                            <span className="text-[10px] font-bold text-gray-400">(Optional)</span>
                                        </div>
                                        <div className="relative">
                                            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                            <input 
                                                type="text"
                                                placeholder="e.g. 24pa1a45b4 (Lookup student)"
                                                value={visitingStudentRoll}
                                                onChange={(e) => {
                                                    setVisitingStudentRoll(e.target.value);
                                                    handleSearchWard(e.target.value);
                                                }}
                                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-semibold text-gray-900 focus:outline-none focus:border-[#f47c20] focus:bg-white transition-all shadow-inner"
                                            />
                                            {searchingStudent && (
                                                <Loader2 className="w-4 h-4 text-[#f47c20] animate-spin absolute right-3.5 top-1/2 -translate-y-1/2" />
                                            )}
                                        </div>

                                        {/* Ward match preview */}
                                        {searchedStudent && (
                                            <div className="mt-2.5 p-3 rounded-2xl bg-orange-50 border border-orange-100 flex items-center gap-3 animate-in fade-in">
                                                <div className="w-9 h-9 rounded-full overflow-hidden border border-white shadow-sm flex-shrink-0 bg-white">
                                                    {searchedStudent.photo_url ? (
                                                        <img src={searchedStudent.photo_url} alt="Profile" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-[#f47c20]">
                                                            {(searchedStudent.full_name || 'S').substring(0, 2).toUpperCase()}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-black text-gray-900 truncate">Ward: {searchedStudent.full_name}</p>
                                                    <p className="text-[10px] font-bold text-gray-500 uppercase">
                                                        {searchedStudent.student_id} • {searchedStudent.departments?.name || 'Department'}
                                                    </p>
                                                </div>
                                                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-[9px] font-black uppercase">
                                                    Student Verified
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Purpose of Visit */}
                                    <div>
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                                            Purpose of Visit
                                        </label>
                                        <div className="flex flex-wrap gap-1.5">
                                            {[
                                                'Parent Meeting / Ward Visit',
                                                'Fee Payment / Accounts',
                                                'Principal / HOD Meeting',
                                                'Hostel / Campus Visit',
                                                'Medical / Emergency',
                                                'Other'
                                            ].map(purpose => (
                                                <button
                                                    key={purpose}
                                                    type="button"
                                                    onClick={() => setVisitorPurpose(purpose)}
                                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                                        visitorPurpose === purpose
                                                            ? 'bg-[#f47c20] text-white shadow-sm'
                                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
                                                    }`}
                                                >
                                                    {purpose}
                                                </button>
                                            ))}
                                        </div>
                                        {visitorPurpose === 'Other' && (
                                            <input 
                                                type="text"
                                                placeholder="Specify custom purpose..."
                                                value={customVisitorPurpose}
                                                onChange={(e) => setCustomVisitorPurpose(e.target.value)}
                                                className="w-full mt-2 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:border-[#f47c20]"
                                            />
                                        )}
                                    </div>

                                    {/* Number of Persons & Vehicle */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">
                                                Persons Count
                                            </label>
                                            <select
                                                value={visitorCount}
                                                onChange={(e) => setVisitorCount(e.target.value)}
                                                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:border-[#f47c20]"
                                            >
                                                <option value="1">1 Person</option>
                                                <option value="2">2 Persons</option>
                                                <option value="3">3 Persons</option>
                                                <option value="4+">4+ Persons</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">
                                                Vehicle / ID Details
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="e.g. AP39 XX 1234"
                                                value={visitorVehicle}
                                                onChange={(e) => setVisitorVehicle(e.target.value)}
                                                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:border-[#f47c20]"
                                            />
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* CATEGORY 2: NEW JOINING MEMBER / ADMISSION FORM */}
                            {passCategory === 'NEW_JOINING' && (
                                <>
                                    {/* Candidate Full Name */}
                                    <div>
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">
                                            Candidate / Joiner Full Name <span className="text-rose-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <UserPlus className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                            <input 
                                                type="text"
                                                required
                                                placeholder="e.g. Sai Kumar (New Student / Staff)"
                                                value={joinerName}
                                                onChange={(e) => setJoinerName(e.target.value)}
                                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-semibold text-gray-900 focus:outline-none focus:border-[#1a2b3c] focus:bg-white transition-all shadow-inner"
                                            />
                                        </div>
                                    </div>

                                    {/* Mobile Number */}
                                    <div>
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">
                                            Mobile / Contact Number <span className="text-rose-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                            <input 
                                                type="tel"
                                                required
                                                placeholder="e.g. 9876543210"
                                                value={joinerPhone}
                                                onChange={(e) => setJoinerPhone(e.target.value)}
                                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-semibold text-gray-900 focus:outline-none focus:border-[#1a2b3c] focus:bg-white transition-all shadow-inner"
                                            />
                                        </div>
                                    </div>

                                    {/* Application No / Rank / Temp ID */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                                                Application No. / Temp ID / Rank
                                            </label>
                                            <span className="text-[10px] font-bold text-gray-400">(Optional)</span>
                                        </div>
                                        <div className="relative">
                                            <FileText className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                            <input 
                                                type="text"
                                                placeholder="e.g. ADM-2024-091 or EAMCET Rank"
                                                value={applicationNo}
                                                onChange={(e) => setApplicationNo(e.target.value)}
                                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-semibold text-gray-900 focus:outline-none focus:border-[#1a2b3c] focus:bg-white transition-all shadow-inner"
                                            />
                                        </div>
                                    </div>

                                    {/* Department / Stream */}
                                    <div>
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">
                                            Department / Branch
                                        </label>
                                        <div className="relative">
                                            <Building2 className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                            <select
                                                value={joinerDept}
                                                onChange={(e) => setJoinerDept(e.target.value)}
                                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-gray-800 focus:outline-none focus:border-[#1a2b3c]"
                                            >
                                                <option value="Artificial Intelligence and Data Science (AI&DS)">Artificial Intelligence and Data Science (AI&DS)</option>
                                                <option value="Computer Science and Engineering (CSE)">Computer Science and Engineering (CSE)</option>
                                                <option value="Information Technology (IT)">Information Technology (IT)</option>
                                                <option value="Electronics and Communication Engineering (ECE)">Electronics and Communication Engineering (ECE)</option>
                                                <option value="Electrical and Electronics Engineering (EEE)">Electrical and Electronics Engineering (EEE)</option>
                                                <option value="Mechanical Engineering (MECH)">Mechanical Engineering (MECH)</option>
                                                <option value="Civil Engineering (CIVIL)">Civil Engineering (CIVIL)</option>
                                                <option value="Master of Business Administration (MBA)">Master of Business Administration (MBA)</option>
                                                <option value="Pharmacy (B.Pharm / M.Pharm)">Pharmacy (B.Pharm / M.Pharm)</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Purpose of Visit */}
                                    <div>
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                                            Joining Purpose / Action
                                        </label>
                                        <div className="flex flex-wrap gap-1.5">
                                            {[
                                                'New Admission / Reporting',
                                                'Counseling & Seat Allotment',
                                                'Document Verification',
                                                'Hostel Allotment / Room',
                                                'Fee Payment / Accounts',
                                                'Campus Tour',
                                                'Other'
                                            ].map(purpose => (
                                                <button
                                                    key={purpose}
                                                    type="button"
                                                    onClick={() => setJoinerPurpose(purpose)}
                                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                                        joinerPurpose === purpose
                                                            ? 'bg-[#1a2b3c] text-white shadow-sm'
                                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
                                                    }`}
                                                >
                                                    {purpose}
                                                </button>
                                            ))}
                                        </div>
                                        {joinerPurpose === 'Other' && (
                                            <input 
                                                type="text"
                                                placeholder="Specify custom purpose..."
                                                value={customJoinerPurpose}
                                                onChange={(e) => setCustomJoinerPurpose(e.target.value)}
                                                className="w-full mt-2 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:border-[#1a2b3c]"
                                            />
                                        )}
                                    </div>

                                    {/* Accompanying Persons */}
                                    <div>
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">
                                            Accompanying Persons Count
                                        </label>
                                        <select
                                            value={joinerCount}
                                            onChange={(e) => setJoinerCount(e.target.value)}
                                            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:border-[#1a2b3c]"
                                        >
                                            <option value="1">1 Person (Candidate Only)</option>
                                            <option value="2">2 Persons (Candidate + 1 Parent)</option>
                                            <option value="3">3 Persons (Candidate + 2 Parents)</option>
                                            <option value="4+">4+ Persons</option>
                                        </select>
                                    </div>
                                </>
                            )}

                            {/* Movement Type (IN / OUT) */}
                            <div>
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                                    Movement Authorization
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setPassMovementType('IN')}
                                        className={`py-3 px-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                            passMovementType === 'IN'
                                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                                : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                                        }`}
                                    >
                                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                        Entry (IN)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPassMovementType('OUT')}
                                        className={`py-3 px-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                            passMovementType === 'OUT'
                                                ? 'bg-orange-600 text-white shadow-lg shadow-orange-500/20'
                                                : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                                        }`}
                                    >
                                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                                        Exit (OUT)
                                    </button>
                                </div>
                            </div>

                            {/* Gate Display */}
                            <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between text-xs">
                                <span className="font-bold text-gray-400 uppercase tracking-wider">Gate Assigned:</span>
                                <span className="font-black text-[#1a2b3c]">{resolvedGateName || guardData?.guard_gates?.name || guardData?.gate_name || 'Main Campus Gate'}</span>
                            </div>

                            {generateError && (
                                <p className="text-xs font-bold text-rose-500 bg-rose-50 p-3 rounded-xl border border-rose-100">
                                    {generateError}
                                </p>
                            )}

                            {/* Submit Action */}
                            <button
                                type="submit"
                                disabled={generatingPass}
                                className="w-full py-4 bg-gradient-to-r from-[#f47c20] to-[#e06b12] hover:from-[#e06b12] hover:to-[#cc5a08] text-white font-black text-xs uppercase tracking-[0.15em] rounded-2xl shadow-xl shadow-orange-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
                            >
                                {generatingPass ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Generating Authorized Pass...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4" />
                                        <span>Generate & Authorize Pass</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Generated Visitor Pass QR Presentation Modal */}
            {visitorQrModal && (
                <div 
                    className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-200"
                    onClick={() => setVisitorQrModal(null)}
                >
                    <div 
                        className="bg-white rounded-[40px] w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-center p-6"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-3">
                            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Pass Generated
                            </span>
                            <button 
                                onClick={() => setVisitorQrModal(null)}
                                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Title */}
                        <h3 className="text-xl font-black text-[#1a2b3c] tracking-tight leading-tight">
                            Scan for Visitor Pass
                        </h3>
                        <p className="text-xs text-gray-500 font-medium mt-1">
                            Ask the visitor to scan this QR code with their phone camera to open their digital pass.
                        </p>

                        {/* QR Code Container */}
                        <div className="my-5 p-5 bg-[#fff8f6] rounded-[32px] border-2 border-[#f47c20]/20 flex flex-col items-center justify-center shadow-inner relative group">
                            <div className="bg-white p-4 rounded-2xl shadow-md border border-gray-100">
                                <QRCodeSVG 
                                    value={visitorQrModal.passUrl}
                                    size={200}
                                    level="M"
                                    includeMargin={false}
                                />
                            </div>
                            <div className="mt-3 flex items-center gap-1.5 text-[11px] font-black text-[#f47c20] uppercase tracking-wider truncate max-w-[240px]">
                                <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
                                <span className="truncate">{visitorQrModal.passData.full_name}</span>
                            </div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                                ID: {visitorQrModal.passData.student_id}
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="space-y-2.5">
                            <button
                                type="button"
                                onClick={() => {
                                    setActiveVerification(visitorQrModal.passData);
                                    setVisitorQrModal(null);
                                }}
                                className="w-full py-3.5 bg-[#1a2b3c] hover:bg-black text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                            >
                                <ShieldCheck className="w-4 h-4 text-[#f47c20]" />
                                <span>View Pass Details</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    if (navigator.clipboard) {
                                        navigator.clipboard.writeText(visitorQrModal.passUrl);
                                        setCopiedUrl(true);
                                        setTimeout(() => setCopiedUrl(false), 2500);
                                    }
                                }}
                                className="w-full py-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 font-black text-xs uppercase tracking-wider rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                            >
                                {copiedUrl ? (
                                    <>
                                        <Check className="w-4 h-4 text-emerald-600" />
                                        <span className="text-emerald-700">Pass Link Copied!</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-4 h-4 text-gray-500" />
                                        <span>Copy Pass URL</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GuardHome;
