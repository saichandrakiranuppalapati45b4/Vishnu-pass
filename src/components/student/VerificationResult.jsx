import React, { useState, useEffect, useRef } from 'react';
import { 
    ChevronLeft, CheckCircle2, ShieldCheck, Zap, Download, Scan, 
    UserCircle, History, LayoutDashboard, User, AlertTriangle, X, 
    Octagon, XCircle, Loader2, Users, GraduationCap, Phone, Car, 
    Building2, FileText, Check, QrCode, Share2, Copy
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';
import { domToPng } from 'modern-screenshot';
import DailyDigitalPass from './DailyDigitalPass';

const VerificationResult = ({ studentData, gateName, verifiedAt, onNextScan, warning, status, hideNavBar = false, customError }) => {
    const [isAcknowledged, setIsAcknowledged] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [localPhotoUrl, setLocalPhotoUrl] = useState(null);
    const [showQrModal, setShowQrModal] = useState(false);
    const [copiedUrl, setCopiedUrl] = useState(false);
    const passRef = useRef(null);

    // Identify if this is an Outer Parent / Visitor or New Joining Pass
    const isVisitorPass = Boolean(
        studentData?.isVisitorPass || 
        studentData?.passCategory || 
        studentData?.student_id?.startsWith('PRNT-') || 
        studentData?.student_id?.startsWith('VIS-') ||
        studentData?.student_id?.startsWith('ADM-') || 
        studentData?.student_id?.startsWith('JOIN-')
    );

    const isParentVisitor = Boolean(
        studentData?.passCategory === 'PARENT' ||
        studentData?.student_id?.startsWith('PRNT-') ||
        studentData?.student_id?.startsWith('VIS-') ||
        String(studentData?.hostel_type || '').includes('Parent')
    );

    const isNewJoiner = Boolean(
        studentData?.passCategory === 'NEW_JOINING' ||
        studentData?.student_id?.startsWith('ADM-') ||
        studentData?.student_id?.startsWith('JOIN-') ||
        String(studentData?.hostel_type || '').includes('New Joining')
    );

    // Calculate pass URL for QR Code
    const passUrl = studentData?.passUrl || (() => {
        try {
            const payloadEncoded = btoa(unescape(encodeURIComponent(JSON.stringify(studentData || {}))));
            return `${window.location.origin}/visitor-pass?id=${encodeURIComponent(studentData?.student_id || 'VIS')}&data=${encodeURIComponent(payloadEncoded)}`;
        } catch (e) {
            return `${window.location.origin}/visitor-pass?id=${encodeURIComponent(studentData?.student_id || 'VIS')}`;
        }
    })();

    // Gate Name resolution and formatting
    const rawGate = gateName || studentData?.gateName || studentData?.guard_gates?.name;
    const formattedGate = rawGate ? String(rawGate).replace(/\b\w/g, c => c.toUpperCase()) : 'Main Campus Gate';

    // CORS-safe photo loading logic (Crucial for Canvas Capture)
    useEffect(() => {
        const loadPhoto = async () => {
            if (!studentData?.photo_url) return;
            try {
                const res = await fetch(studentData.photo_url);
                if (!res.ok) throw new Error("Fetch failed");
                const blob = await res.blob();
                setLocalPhotoUrl(URL.createObjectURL(blob));
            } catch (err) {
                console.error("Failed to load photo for canvas", err);
            }
        };
        loadPhoto();
    }, [studentData?.photo_url]);

    const handleDownloadPass = async () => {
        if (!passRef.current || downloading) return;
        setDownloading(true);

        try {
            const dataUrl = await domToPng(passRef.current, {
                scale: 2,
                backgroundColor: '#ffffff',
                cacheBust: true
            });

            const fileName = isVisitorPass 
                ? `VisitorPass_${studentData?.student_id || 'Visitor'}_${format(new Date(), 'ddMMM')}.png`
                : `DailyPass_${studentData?.student_id || 'Student'}_${format(new Date(), 'ddMMM')}.png`;

            if (navigator.share && /mobile|android|iphone|ipad/i.test(navigator.userAgent)) {
                try {
                    const res = await fetch(dataUrl);
                    const blob = await res.blob();
                    const file = new File([blob], fileName, { type: 'image/png' });
                    await navigator.share({ title: isVisitorPass ? 'Visitor Entry Pass' : 'Today\'s Daily Pass', files: [file] });
                    setDownloading(false);
                    return;
                } catch (e) { }
            }

            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            alert("Failed to generate Pass image. Please try again.");
        } finally {
            setDownloading(false);
        }
    };

    // Real-time Expiration & Usage Validation
    const isStudentInactive = studentData?.status && ['inactive', 'suspended', 'blocked'].includes(String(studentData.status).toLowerCase());
    
    // Status-based expiration (only when explicitly expired or student account inactive)
    const isExpired = Boolean(
        !isVisitorPass && (
            isStudentInactive ||
            (status && ['expired'].includes(status.toLowerCase()))
        )
    );

    // Denied status
    const isDenied = Boolean(
        customError ||
        (status && ['rejected', 'denied', 'cancelled', 'error'].includes(status.toLowerCase()) && !isExpired)
    );

    useEffect(() => {
        if (isDenied || (warning && !isAcknowledged)) {
            // Play warning sound
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.volume = 0.6;
            audio.play().catch(() => {});
        }
    }, [warning, isAcknowledged, isDenied]);

    // Dedicated ACCESS DENIED screen for limit reached or rejected requests
    if (isDenied) {
        return (
            <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center p-6 bg-gradient-to-br from-rose-950 via-rose-900 to-black font-sans h-screen overflow-y-auto">
                <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none overflow-hidden">
                    <Octagon className="w-[800px] h-[800px] absolute -top-40 -left-40 animate-pulse text-rose-500" />
                    <Octagon className="w-[600px] h-[600px] absolute -bottom-20 -right-20 animate-pulse text-rose-500" />
                </div>

                <div className="relative z-10 w-full max-w-sm flex flex-col items-center text-center animate-in zoom-in duration-500 my-auto py-8">
                    <div className="relative mb-8">
                        <div className="absolute inset-0 bg-rose-500/20 rounded-[40px] animate-ping scale-110" />
                        <div className="w-36 h-36 bg-rose-500/20 backdrop-blur-3xl rounded-[40px] flex items-center justify-center border-4 border-rose-500/40 shadow-2xl relative z-20">
                            <XCircle className="w-20 h-20 text-rose-400 animate-bounce" />
                        </div>
                    </div>

                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[10px] font-black uppercase tracking-[0.2em] mb-4">
                        <span>Access Denied</span>
                    </div>

                    <h1 className="text-3xl font-black text-white tracking-tight uppercase mb-3 drop-shadow-md">
                        Pass Rejected
                    </h1>
                    
                    <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-[32px] p-6 mb-8 w-full shadow-2xl text-left">
                        <div className="flex items-start gap-3 mb-4">
                            <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-white text-sm font-black leading-snug">
                                    {warning || customError || "Monthly pass limit has been reached for this student category."}
                                </p>
                                <p className="text-white/60 text-[11px] font-medium mt-1 leading-relaxed">
                                    Entry or exit authorization cannot be granted. This request was rejected by institutional policy.
                                </p>
                            </div>
                        </div>

                        <div className="h-px bg-white/10 w-full my-4" />

                        <div className="space-y-2 text-xs">
                            <div className="flex justify-between items-center text-white/80">
                                <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Student Name</span>
                                <span className="font-bold text-white">{studentData?.full_name || 'Student'}</span>
                            </div>
                            <div className="flex justify-between items-center text-white/80">
                                <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Student ID</span>
                                <span className="font-bold text-white">{studentData?.student_id || studentData?.id || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between items-center text-white/80">
                                <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Gate</span>
                                <span className="font-bold text-white">{formattedGate}</span>
                            </div>
                            <div className="flex justify-between items-center text-white/80">
                                <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Status</span>
                                <span className="font-black text-rose-400 uppercase tracking-widest">Rejected / Denied</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 w-full">
                        <button
                            onClick={onNextScan}
                            className="w-full py-5 bg-white text-rose-900 rounded-[24px] font-black text-xs tracking-[0.2em] uppercase shadow-[0_10px_40px_rgba(0,0,0,0.2)] active:scale-[0.98] transition-all hover:bg-rose-50 cursor-pointer"
                        >
                            Return to Dashboard
                        </button>
                        
                        <p className="text-white/40 text-[9px] font-bold uppercase tracking-widest text-center">
                            Logged in security audit records
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // If there's an informational warning and it hasn't been acknowledged, show the Dedicated Warning Page
    if (warning && !isAcknowledged) {
        return (
            <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center p-6 bg-gradient-to-br from-[#f47c20] to-[#e76f51] font-sans h-screen overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none overflow-hidden">
                    <Octagon className="w-[800px] h-[800px] absolute -top-40 -left-40 animate-pulse text-white" />
                    <Octagon className="w-[600px] h-[600px] absolute -bottom-20 -right-20 animate-pulse text-white" />
                </div>

                <div className="relative z-10 w-full max-w-sm flex flex-col items-center text-center animate-in zoom-in duration-500">
                    <div className="relative mb-10 mt-10">
                        <div className="absolute inset-0 bg-white/20 rounded-[40px] animate-ping scale-110" />
                        <div className="w-40 h-40 bg-white/20 backdrop-blur-3xl rounded-[40px] flex items-center justify-center border-4 border-white/40 shadow-2xl relative z-20">
                            <AlertTriangle className="w-20 h-20 text-white animate-bounce" />
                        </div>
                    </div>

                    <h1 className="text-4xl font-black text-white tracking-tight uppercase mb-4 drop-shadow-md">
                        Notice
                    </h1>
                    
                    <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-[32px] p-8 mb-10 w-full shadow-2xl">
                        <p className="text-white text-lg font-black leading-tight mb-3">
                            {warning}
                        </p>
                        <div className="h-px bg-white/20 w-16 mx-auto mb-4" />
                        <p className="text-white/80 text-[10px] font-bold uppercase tracking-[0.2em] leading-relaxed">
                            Please be informed that campus security regulations apply to this entry/exit.
                        </p>
                    </div>

                    <div className="space-y-4 w-full">
                        <button
                            onClick={() => setIsAcknowledged(true)}
                            className="w-full py-6 bg-white text-[#f47c20] rounded-[24px] font-black text-sm tracking-[0.2em] uppercase shadow-[0_10px_40px_rgba(0,0,0,0.1)] active:scale-[0.98] transition-all hover:shadow-none cursor-pointer"
                        >
                            I Understand & Continue
                        </button>
                        
                        <p className="text-white/60 text-[9px] font-bold uppercase tracking-widest text-center mt-4">
                            Authorized access verified for {studentData?.full_name || 'Visitor'}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col bg-[#f8f9fb] animate-in slide-in-from-bottom duration-500 overflow-y-auto font-sans h-screen pb-32 relative">
            {/* Hidden Pass for Capture */}
            <div className="absolute left-[-9999px] top-[-9999px] pointer-events-none">
                <DailyDigitalPass 
                    ref={passRef}
                    studentData={studentData}
                    gateName={formattedGate}
                    verifiedAt={verifiedAt}
                    isExpired={isExpired}
                    isDenied={isDenied}
                    denialReason={warning || customError}
                    isVisitorPass={isVisitorPass}
                    isParentVisitor={isParentVisitor}
                    isNewJoiner={isNewJoiner}
                    photoUrl={localPhotoUrl || studentData?.photo_url}
                />
            </div>

            {/* Header */}
            <div className="px-6 py-8 flex items-center bg-white justify-between sticky top-0 z-50 shadow-sm">
                <button
                    onClick={onNextScan}
                    className="w-10 h-10 flex items-center justify-center text-[#1a2b3c] active:scale-90 transition-transform cursor-pointer"
                >
                    <ChevronLeft className="w-8 h-8" />
                </button>
                <div className="text-center">
                    <h2 className="text-lg font-black text-[#1a2b3c] tracking-tight leading-none">
                        {isVisitorPass ? (isParentVisitor ? 'Parent / Visitor Pass' : 'New Admission Pass') : 'Verification Result'}
                    </h2>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                        {isVisitorPass ? 'Official Gate Authorization' : 'Digital Student ID'}
                    </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#fff5ec] flex items-center justify-center text-[#f47c20]">
                    <LayoutDashboard className="w-5 h-5" />
                </div>
            </div>

            <div className="px-6 py-6 space-y-6 max-w-lg mx-auto w-full">
                {/* Profile Section */}
                <div className="flex flex-col items-center text-center">
                    <div className="relative mb-6">
                        {/* Status Label Popup */}
                        <div className={`absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border-2 shadow-lg z-20 backdrop-blur-md ${
                            isExpired || isDenied
                                ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 shadow-rose-500/10' 
                                : isParentVisitor
                                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 shadow-amber-500/10'
                                    : isNewJoiner
                                        ? 'bg-purple-500/10 border-purple-500/30 text-purple-700 shadow-purple-500/10'
                                        : String(studentData?.hostel_type).toLowerCase().includes('dayscholar') 
                                            ? 'bg-blue-500/10 border-blue-500/30 text-blue-600 shadow-blue-500/10' 
                                            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 shadow-emerald-500/10'
                        }`}>
                            {isExpired 
                                ? 'Expired VID' 
                                : isDenied 
                                    ? 'Denied' 
                                    : isParentVisitor
                                        ? 'Parent / Visitor'
                                        : isNewJoiner
                                            ? 'New Admission'
                                            : String(studentData?.hostel_type).toLowerCase().includes('dayscholar') ? 'Dayscholar' : 'Hosteller'}
                        </div>

                        <div className={`w-44 h-44 rounded-full overflow-hidden border-4 bg-white relative z-10 shadow-2xl transition-all duration-500 ${
                            isExpired || isDenied 
                                ? 'border-rose-100 shadow-rose-500/20 ring-4 ring-rose-500/10' 
                                : isParentVisitor
                                    ? 'border-amber-100 shadow-amber-500/20 ring-4 ring-amber-500/10'
                                    : isNewJoiner
                                        ? 'border-purple-100 shadow-purple-500/20 ring-4 ring-purple-500/10'
                                        : 'border-emerald-100 shadow-emerald-500/20 ring-4 ring-emerald-500/10'
                        }`}>
                            {studentData?.photo_url ? (
                                <img src={studentData.photo_url} alt="Profile" className={`w-full h-full object-cover ${isExpired ? 'grayscale-[0.3]' : ''}`} />
                            ) : isParentVisitor ? (
                                <div className="w-full h-full bg-gradient-to-br from-amber-400 via-[#f47c20] to-[#e76f51] flex items-center justify-center text-white shadow-inner">
                                    <Users className="w-20 h-20 drop-shadow-md" />
                                </div>
                            ) : isNewJoiner ? (
                                <div className="w-full h-full bg-gradient-to-br from-indigo-500 via-purple-600 to-indigo-800 flex items-center justify-center text-white shadow-inner">
                                    <GraduationCap className="w-20 h-20 drop-shadow-md" />
                                </div>
                            ) : (
                                <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-300">
                                    <UserCircle className="w-24 h-24" />
                                </div>
                            )}
                        </div>
                        <div className={`absolute bottom-2 right-2 w-10 h-10 rounded-full flex items-center justify-center border-4 border-white shadow-lg z-20 ${
                            isExpired || isDenied ? 'bg-rose-500' : 'bg-[#a6cc39]'
                        }`}>
                            {isExpired || isDenied ? <XCircle className="w-5 h-5 text-white" /> : <CheckCircle2 className="w-5 h-5 text-white" />}
                        </div>
                    </div>

                    <h1 className="text-3xl font-black text-[#1a2b3c] tracking-tight">{studentData?.full_name || 'Visitor Name'}</h1>
                    <p className="text-slate-400 font-bold tracking-wide mt-1">
                        {isVisitorPass 
                            ? (isParentVisitor ? `Parent / Visitor Pass • ${studentData?.student_id || 'ACTIVE'}` : `Admission Candidate • ${studentData?.student_id || 'ACTIVE'}`)
                            : `Student ID: ${studentData?.student_id || 'ID'}`}
                    </p>
                </div>

                {/* Status Card */}
                <div className={`${
                    isExpired || isDenied 
                        ? 'bg-rose-50 border-rose-200' 
                        : warning 
                            ? 'bg-amber-50 border-amber-200' 
                            : 'bg-[#f0f4e8] border-[#e0e7d0]'
                } rounded-[32px] p-6 flex items-center justify-between shadow-sm`}>
                    <div>
                        <h3 className={`${
                            isExpired || isDenied ? 'text-rose-600' : warning ? 'text-amber-600' : 'text-[#a6cc39]'
                        } text-xl font-black tracking-tight uppercase`}>
                            {isExpired ? 'VID Expired' : isDenied ? 'Access Denied' : warning ? 'Limit Warning' : 'Authorized Pass'}
                        </h3>
                        <p className="text-slate-500 text-xs font-bold">
                            {isExpired 
                                ? 'Pass has expired or student is inactive'
                                : isDenied ? (customError || 'Request was rejected or denied') 
                                : warning ? warning 
                                : isVisitorPass ? 'Authorized for Campus Entry' : 'Access Authorized for Entry'}
                        </p>
                    </div>
                    <div className={`flex items-center gap-2 ${
                        isExpired || isDenied 
                            ? 'bg-rose-500 shadow-rose-500/20' 
                            : warning 
                                ? 'bg-amber-500 shadow-amber-500/20' 
                                : 'bg-[#a6cc39] shadow-[#a6cc39]/20'
                    } text-white px-4 py-2 rounded-xl text-xs font-black tracking-widest uppercase shadow-lg`}>
                        {isExpired || isDenied ? <XCircle className="w-4 h-4" /> : warning ? <Zap className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                        {isExpired ? 'Expired' : isDenied ? 'Denied' : warning ? 'Alert' : 'Authorized'}
                    </div>
                </div>

                {/* Visitor Phone Scan Callout Card */}
                {isVisitorPass && (
                    <div 
                        onClick={() => setShowQrModal(true)}
                        className="bg-gradient-to-r from-[#f47c20] to-[#e76f51] rounded-[30px] p-5 text-white shadow-xl shadow-orange-500/20 flex items-center justify-between cursor-pointer hover:shadow-2xl active:scale-[0.98] transition-all"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                                <QrCode className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h4 className="text-sm font-black uppercase tracking-tight">Scan for Mobile Pass</h4>
                                <p className="text-[11px] text-white/80 font-medium">Show QR code for visitor to scan</p>
                            </div>
                        </div>
                        <span className="px-3 py-1.5 rounded-xl bg-white text-[#f47c20] text-xs font-black uppercase tracking-wider shadow-sm">
                            Show QR
                        </span>
                    </div>
                )}

                {/* Pass Details / Information */}
                <div>
                    <h4 className="text-[11px] font-black text-[#f47c20] uppercase tracking-[0.2em] mb-4 px-2">
                        {isParentVisitor ? 'Visitor & Ward Information' : isNewJoiner ? 'Candidate & Admission Details' : 'Student Information'}
                    </h4>
                    <div className="bg-white rounded-[40px] p-8 shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-gray-50 space-y-6">
                        {isParentVisitor ? (
                            [
                                { label: 'Visitor / Parent Name', value: studentData?.full_name || 'Visitor', color: 'text-[#1a2b3c]' },
                                { label: 'Contact Number', value: studentData?.contact_number || 'N/A', color: 'text-slate-600' },
                                { label: 'Visiting Ward / Student', value: studentData?.visiting_student || 'Campus Official / Faculty', color: 'text-[#1a2b3c]' },
                                { label: 'Purpose of Visit', value: studentData?.purpose || 'Campus Visit', color: 'text-[#f47c20]' },
                                { label: 'Total Persons', value: `${studentData?.persons_count || '1'} Person(s)`, color: 'text-slate-600' },
                                { label: 'Vehicle / ID Proof', value: studentData?.vehicle_no || 'None', color: 'text-slate-600' },
                                { label: 'Category', value: 'Outer Parent / Visitor', color: 'text-[#1a2b3c]' },
                            ].map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between border-b border-slate-50 last:border-0 pb-4 last:pb-0">
                                    <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">{item.label}</span>
                                    <span className={`text-[12px] font-black ${item.color} text-right ml-4 break-all max-w-[60%]`}>{item.value}</span>
                                </div>
                            ))
                        ) : isNewJoiner ? (
                            [
                                { label: 'Candidate Name', value: studentData?.full_name || 'Candidate', color: 'text-[#1a2b3c]' },
                                { label: 'Contact Number', value: studentData?.contact_number || 'N/A', color: 'text-slate-600' },
                                { label: 'Department / Branch', value: studentData?.departments?.name || studentData?.department_name || studentData?.department || 'Engineering Stream', color: 'text-[#1a2b3c]' },
                                { label: 'Application / Temp ID', value: studentData?.application_no || studentData?.student_id || 'N/A', color: 'text-purple-700' },
                                { label: 'Purpose / Action', value: studentData?.purpose || 'New Admission / Reporting', color: 'text-[#f47c20]' },
                                { label: 'Accompanying Persons', value: `${studentData?.persons_count || '1'} Person(s)`, color: 'text-slate-600' },
                                { label: 'Category', value: 'New Joining Member', color: 'text-[#1a2b3c]' },
                            ].map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between border-b border-slate-50 last:border-0 pb-4 last:pb-0">
                                    <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">{item.label}</span>
                                    <span className={`text-[12px] font-black ${item.color} text-right ml-4 break-all max-w-[60%]`}>{item.value}</span>
                                </div>
                            ))
                        ) : (
                            [
                                { label: 'Department', value: studentData?.departments?.name || studentData?.department_name || studentData?.department || 'Engineering', color: 'text-[#1a2b3c]' },
                                { label: 'Academic Year', value: `${studentData?.year_of_study || '3rd Year'} (Batch ${studentData?.batch || '2021-2025'})`, color: 'text-[#1a2b3c]' },
                                { label: 'Institutional Email', value: studentData?.email || 'N/A', color: 'text-slate-600' },
                                { label: 'Student Contact', value: studentData?.contact_number || 'N/A', color: 'text-slate-600' },
                                { label: 'Gender', value: studentData?.gender || 'N/A', color: 'text-slate-600' },
                                { label: 'Campus', value: studentData?.campus || 'Main Campus', color: 'text-slate-600' },
                                { label: 'Hostel/Room', value: studentData?.hostel_type || studentData?.hostel || 'Day Scholar', color: 'text-[#1a2b3c]' },
                            ].map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between border-b border-slate-50 last:border-0 pb-4 last:pb-0">
                                    <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">{item.label}</span>
                                    <span className={`text-[12px] font-black ${item.color} text-right ml-4 break-all max-w-[60%]`}>{item.value}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Verification Details */}
                <div>
                    <h4 className="text-[11px] font-black text-[#f47c20] uppercase tracking-[0.2em] mb-4 px-2">Verification & Gate Details</h4>
                    <div className="bg-white rounded-[40px] p-8 shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-gray-50 space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-[#f8f9fb] p-4 rounded-2xl">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Entry Point</p>
                                <p className="text-[11px] font-black text-[#1a2b3c]">{formattedGate}</p>
                            </div>
                            <div className="bg-[#f8f9fb] p-4 rounded-2xl">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Authorized At</p>
                                <p className="text-[11px] font-black text-[#1a2b3c]">
                                    {(() => {
                                        if (!verifiedAt) return format(new Date(), 'hh:mm a');
                                        const date = new Date(verifiedAt);
                                        if (isNaN(date.getTime())) return verifiedAt;
                                        return format(date, 'hh:mm a');
                                    })()}
                                    , Today
                                </p>
                            </div>
                            <div className="col-span-2 bg-[#f8f9fb] p-4 rounded-2xl">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Pass Validity</p>
                                <p className={`text-[11px] font-black ${isDenied ? 'text-rose-600' : 'text-[#1a2b3c]'}`}>
                                    {isDenied 
                                        ? 'Access Denied • No Pass Issued' 
                                        : `Valid Today Until 11:59 PM (${format(new Date(), 'dd MMM yyyy')})`}
                                </p>
                            </div>
                        </div>

                        {/* Download Pass Button */}
                        <button
                            onClick={handleDownloadPass}
                            disabled={downloading || isDenied}
                            className="w-full py-5 bg-[#1a2b3c] hover:bg-black text-white rounded-[24px] font-black text-[13px] tracking-[0.1em] uppercase shadow-xl shadow-gray-200 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 mt-4 cursor-pointer"
                        >
                            {downloading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Generating Gate Pass...</span>
                                </>
                            ) : isDenied ? (
                                <>
                                    <XCircle className="w-5 h-5 text-rose-400" />
                                    <span>Pass Denied (Not Issued)</span>
                                </>
                            ) : (
                                <>
                                    <ShieldCheck className="w-5 h-5" />
                                    <span>{isVisitorPass ? 'Download Visitor Gate Pass' : 'Download Today\'s VID'}</span>
                                </>
                            )}
                        </button>
                        <p className="text-center text-[9px] font-bold text-slate-300 uppercase tracking-widest mt-2">
                            Official Vishnu Gate Authorization Pass
                        </p>
                    </div>
                </div>
            </div>

            {/* Visitor QR Code Modal */}
            {showQrModal && (
                <div 
                    className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-200"
                    onClick={() => setShowQrModal(false)}
                >
                    <div 
                        className="bg-white rounded-[40px] w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-center p-6"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <span className="px-3 py-1 rounded-full bg-[#f47c20]/10 text-[#f47c20] text-[10px] font-black uppercase tracking-widest">
                                Visitor Pass QR
                            </span>
                            <button 
                                onClick={() => setShowQrModal(false)}
                                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <h3 className="text-xl font-black text-[#1a2b3c] tracking-tight leading-tight">
                            Scan with Phone
                        </h3>
                        <p className="text-xs text-gray-500 font-medium mt-1">
                            Scan this QR code with a smartphone camera to load the visitor pass.
                        </p>

                        <div className="my-5 p-5 bg-[#fff8f6] rounded-[32px] border-2 border-[#f47c20]/20 flex flex-col items-center justify-center shadow-inner">
                            <div className="bg-white p-4 rounded-2xl shadow-md border border-gray-100">
                                <QRCodeSVG 
                                    value={passUrl}
                                    size={200}
                                    level="M"
                                    includeMargin={false}
                                />
                            </div>
                            <p className="mt-3 text-xs font-black text-[#f47c20] uppercase truncate max-w-[240px]">
                                {studentData?.full_name}
                            </p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                                ID: {studentData?.student_id}
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                if (navigator.clipboard) {
                                    navigator.clipboard.writeText(passUrl);
                                    setCopiedUrl(true);
                                    setTimeout(() => setCopiedUrl(false), 2500);
                                }
                            }}
                            className="w-full py-3.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-800 font-black text-xs uppercase tracking-wider rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                            {copiedUrl ? (
                                <>
                                    <Check className="w-4 h-4 text-emerald-600" />
                                    <span className="text-emerald-700">Link Copied to Clipboard!</span>
                                </>
                            ) : (
                                <>
                                    <Copy className="w-4 h-4 text-gray-500" />
                                    <span>Copy Pass Link</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VerificationResult;
