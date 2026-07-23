import React, { useRef, useState } from 'react';
import { domToPng } from 'modern-screenshot';
import { Download, Loader2, ShieldCheck } from 'lucide-react';
import { db } from '../../config/firebase';
import { getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { generateQrToken } from '../../lib/functions';

const VirtualIdCard = ({ studentData }) => {
    const cardRef = useRef(null);
    const [downloading, setDownloading] = useState(false);
    const [localPhotoUrl, setLocalPhotoUrl] = useState(null);
    const [qrToken, setQrToken] = useState(null);
    const [qrLoading, setQrLoading] = useState(true);

    const fetchToken = async () => {
        try {
            setQrLoading(true);
            const result = await generateQrToken();
            setQrToken(result.data.token);
        } catch (error) {
            console.error("Failed to generate QR token", error);
        } finally {
            setQrLoading(false);
        }
    };

    React.useEffect(() => {
        fetchToken();
        const interval = setInterval(fetchToken, 25000); // refresh slightly before 30s
        return () => clearInterval(interval);
    }, []);

    React.useEffect(() => {
        const loadPhoto = async () => {
            if (!studentData?.photo_url) return;

            try {
                // Extract path from public URL to use the native Supabase SDK (handles CORS implicitly)
                const match = studentData.photo_url.match(/\/object\/public\/students\/(.+)$/);

                if (match && match[1]) {
                    // Firebase Storage logic should go here, but since photo_url is typically a public URL we can just fetch it.
                    // For the sake of migration, we'll keep the fallback proxy fetch for now.
                    const res = await fetch(studentData.photo_url);
                    if (!res.ok) throw new Error("Fetch failed");
                    const blob = await res.blob();
                    setLocalPhotoUrl(URL.createObjectURL(blob));
                } else {
                    // Fallback proxy fetch
                    const res = await fetch(studentData.photo_url);
                    if (!res.ok) throw new Error("Fetch failed");
                    const blob = await res.blob();
                    setLocalPhotoUrl(URL.createObjectURL(blob));
                }
            } catch (err) {
                setLocalPhotoUrl(null);
            }
        };

        loadPhoto();
    }, [studentData?.photo_url]);

    const handleDownload = async () => {
        if (!cardRef.current || downloading) return;
        setDownloading(true);

        try {
            // ADVANCED SOLUTION: Use modern-screenshot for high-fidelity 2x scale capture
            const dataUrl = await domToPng(cardRef.current, {
                scale: 2,
                backgroundColor: '#ffffff',
                cacheBust: true,
                onClone: (clonedNode) => {
                    // Pre-cleanup during cloning for absolute fidelity
                    const hideEls = clonedNode.querySelectorAll('.hide-on-print');
                    hideEls.forEach(el => el.remove());
                }
            });

            const fileName = `Vishnu_VID_${studentData?.student_id || 'Student'}.png`;

            // 1. Try Native Web Share API first (Best for Mobile Users)
            if (navigator.share && /mobile|android|iphone|ipad/i.test(navigator.userAgent)) {
                try {
                    const res = await fetch(dataUrl);
                    const blob = await res.blob();
                    const file = new File([blob], fileName, { type: 'image/png' });
                    await navigator.share({
                        title: 'My Virtual ID',
                        files: [file]
                    });
                    setDownloading(false);
                    return; 
                } catch (shareError) {
                }
            }

            // 2. Standard DOM Anchor Fallback
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            alert(`Failed to download Virtual ID: ${errorMsg}. Please try again or take a screenshot.`);
        } finally {
            setDownloading(false);
        }
    };

    const initials = studentData?.full_name
        ? studentData.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
        : 'ST';

    // Parse names
    const fullName = studentData?.full_name || 'Vishnu Student';

    const deptFull = studentData?.departments?.name || '';
    let deptShort = 'DEPT';
    if (deptFull) {
        // 1. Acronym extraction
        const match = deptFull.match(/\(([^)]+)\)/);
        if (match && match[1]) {
            deptShort = match[1];
        } else {
            // 2. Acronym generation
            deptShort = deptFull
                .split(/\s+/)
                .map(word => {
                    const lWord = word.toLowerCase();
                    if (lWord === 'and' || lWord === '&') return '&';
                    const stopWords = ['of', 'for', 'the'];
                    if (stopWords.includes(lWord)) return '';
                    return word[0];
                })
                .join('');
        }
        deptShort = deptShort.toUpperCase().replace(/[^A-Z0-9&]/g, '');
        if (deptShort.length < 2) deptShort = deptFull.substring(0, 4).toUpperCase();
    }

    const yearLabel = `${studentData?.year_of_study || '1'}${studentData?.year_of_study == 1 ? 'st' :
        studentData?.year_of_study == 2 ? 'nd' :
            studentData?.year_of_study == 3 ? 'rd' : 'th'
        } Year Student`;

    return (
        <div className="w-full flex flex-col items-center py-6 mb-12">
            {/* Branded Identity Export Wrapper */}
            <div
                ref={cardRef}
                className="w-full max-w-[380px] bg-white p-4 sm:p-7 pb-5 flex flex-col items-center relative transition-all"
                style={{ borderRadius: '32px sm:48px' }}
            >
                {/* Official Institution Branding - Header */}
                <div className="w-full text-center mb-5 sm:mb-8 pt-2 px-2">
                    <h1 className="text-[#1a2b3c] font-[900] text-[16px] sm:text-[22px] tracking-tight leading-tight uppercase">
                        Vishnu Institute of Technology
                    </h1>
                    <div className="h-[2px] w-12 sm:w-14 bg-[#f47c20] mx-auto mt-2 sm:mt-2.5 rounded-full opacity-60" />
                </div>

                {/* Secure ID Container */}
                <div
                    className="w-full bg-white rounded-[24px] sm:rounded-[40px] overflow-hidden relative"
                    style={{
                        boxShadow: '0 20px 50px rgba(0,0,0,0.05), 0 1px 4px rgba(0,0,0,0.02)',
                        border: '1px solid #f1f5f9'
                    }}
                >
                    {/* Visual Decor Element */}
                    <div className="hide-on-print absolute top-0 right-0 w-72 h-72 bg-orange-50/50 rounded-full blur-3xl -translate-y-28 translate-x-28 pointer-events-none" />

                    <div className="p-5 sm:p-9 relative z-10">
                        {/* Senior Branded Identity Banner */}
                        <div className="flex flex-col gap-4 sm:gap-6 mb-6 sm:mb-10">
                            <div className="flex items-start gap-4 sm:gap-6">
                                {/* Academic Photo Block */}
                                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-[16px] sm:rounded-[24px] overflow-hidden flex-shrink-0 shadow-sm border-2 border-white/80 bg-[#fad6bd] relative">
                                    {localPhotoUrl || studentData?.photo_url ? (
                                        <img src={localPhotoUrl || studentData.photo_url} crossOrigin="anonymous" alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-[#f47c20] font-[900] text-xl sm:text-2xl uppercase">
                                            {initials}
                                        </div>
                                    )}
                                </div>

                                {/* Primary Identity Details */}
                                <div className="flex-1 pt-0.5 sm:pt-1.5 overflow-hidden">
                                    <h2 className="text-[16px] sm:text-[22px] font-[900] leading-[1.2] whitespace-pre-wrap break-words pr-1"
                                        style={{ color: '#1a2b3c', wordBreak: 'keep-all' }}
                                    >
                                        {fullName.toUpperCase()}
                                    </h2>
                                    <p className="font-bold text-[9px] sm:text-[11px] uppercase tracking-[0.1em] mt-1.5 sm:mt-2 opacity-50">
                                        REG ID: {studentData?.student_id || 'N/A'}
                                    </p>
                                </div>
                            </div>
                            
                            {/* Academic Status Strip */}
                            <div className="flex items-center justify-between pt-3 sm:pt-4 border-t border-slate-50 min-h-[40px]">
                                <span className="font-black text-[10px] sm:text-[12px] uppercase tracking-wide"
                                    style={{ color: '#f47c20' }}
                                >
                                    {yearLabel}
                                </span>
                                <span className="font-[900] text-[8px] sm:text-[10px] uppercase px-2 sm:px-3 py-1 rounded-full bg-[#f5f3ff] inline-flex items-center"
                                    style={{ color: '#7e22ce' }}
                                >
                                    {studentData?.batch ? `BATCH ${studentData.batch}` : 'SESSION'}
                                </span>
                            </div>
                        </div>

                        {/* Attribute Data Grid */}
                        <div className="grid grid-cols-2 gap-x-4 sm:gap-x-8 gap-y-5 sm:gap-y-7 pt-5 sm:pt-7 border-t border-slate-50">
                            <div>
                                <p className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">DEPT</p>
                                <p className="text-[12px] sm:text-[14px] font-[900] text-[#1a2b3c] truncate">{deptShort}</p>
                                <p className="text-[8px] sm:text-[9px] font-medium text-slate-400 italic truncate" title={studentData?.departments?.name}>
                                    {studentData?.departments?.name || 'Department'}
                                </p>
                            </div>

                            <div>
                                <p className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">CONTACT</p>
                                <p className="text-[12px] sm:text-[14px] font-[900] text-[#1a2b3c] truncate">{studentData?.contact_number || 'N/A'}</p>
                                <p className="text-[8px] sm:text-[9px] font-medium text-slate-400 italic">Official Record</p>
                            </div>

                            <div className="col-span-2">
                                <p className="text-[9px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Institutional Email</p>
                                <p className="text-[13px] sm:text-[15px] font-[900] text-[#1a2b3c] truncate break-all">{studentData?.email || 'N/A'}</p>
                            </div>

                            <div>
                                <p className="text-[9px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Gender</p>
                                <p className="text-[13px] sm:text-[15px] font-[900] text-[#1a2b3c] truncate uppercase">{studentData?.gender || 'N/A'}</p>
                            </div>

                            <div>
                                <p className="text-[9px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Logistics</p>
                                <p className="text-[13px] sm:text-[15px] font-[900] text-[#1a2b3c] truncate">{studentData?.hostel || 'Day Scholar'}</p>
                            </div>

                            <div>
                                <p className="text-[9px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">CAMPUS</p>
                                <p className="text-[13px] sm:text-[15px] font-[900] text-[#1a2b3c] truncate">{studentData?.campus || 'Main Campus'}</p>
                            </div>

                            {/* Official Digital VID Verification */}
                            <div>
                                <p className="text-[9px] sm:text-[11px] font-bold text-[#7e22ce] uppercase tracking-[0.12em] mb-1.5 flex items-center gap-1.5 opacity-60">
                                    <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                    <span>VID IDENTITY</span>
                                </p>
                                <p className="text-[13px] sm:text-[15px] font-[900] text-[#1a2b3c] tracking-tight">
                                    VERIFIED
                                </p>
                                <p className="text-[8px] sm:text-[9px] font-medium text-slate-400 italic uppercase">Secure Pass</p>
                            </div>
                        </div>
                        
                        {/* Dynamic QR Code Area */}
                        <div className="mt-6 flex flex-col items-center pt-5 border-t border-slate-50">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Scan at Gate</p>
                            <div className="w-32 h-32 bg-white rounded-xl shadow-inner border border-gray-100 p-2 relative overflow-hidden flex items-center justify-center">
                                {qrLoading && !qrToken ? (
                                    <Loader2 className="w-6 h-6 text-[#f47c20] animate-spin" />
                                ) : qrToken ? (
                                    <img 
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrToken)}`} 
                                        alt="Security QR" 
                                        className="w-full h-full object-contain"
                                    />
                                ) : (
                                    <p className="text-xs text-red-500 font-bold text-center">QR Error</p>
                                )}
                            </div>
                            <p className="text-[8px] font-medium text-slate-400 uppercase tracking-[0.2em] mt-3">Refreshes every 30s</p>
                        </div>
                    </div>
                </div>

                {/* Institution Signature Footer */}
                <div className="w-full text-center mt-8 pb-3">
                    <p className="text-[11px] font-[900] tracking-[0.3em] uppercase opacity-[0.15] select-none"
                        style={{ color: '#1a2b3c' }}
                    >
                        vishnu pass auth
                    </p>
                </div>
            </div>

            {/* Global Identity Export Action (Outside cardRef for clean image) */}
            <div className="mt-10 flex flex-col items-center gap-3">
                <button
                    onClick={handleDownload}
                    disabled={downloading}
                    className="px-14 py-4.5 bg-[#1a2b3c] hover:bg-black text-white rounded-[24px] font-black text-[15px] tracking-tight transition-all active:scale-95 shadow-2xl shadow-gray-200 flex items-center gap-3.5 disabled:opacity-50"
                >
                    {downloading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>PREPARING IDENTITY...</span>
                        </>
                    ) : (
                        <>
                            <Download className="w-5 h-5" />
                            <span>DOWNLOAD OFFICIAL VIRTUAL ID</span>
                        </>
                    )}
                </button>
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.25em] select-none opacity-60">
                    High Fidelity Academic Export
                </p>
            </div>
        </div>
    );
};

export default VirtualIdCard;
