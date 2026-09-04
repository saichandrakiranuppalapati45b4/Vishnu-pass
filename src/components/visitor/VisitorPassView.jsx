import React, { useState, useEffect, useRef } from 'react';
import { 
    ShieldCheck, CheckCircle2, Download, Share2, Users, 
    GraduationCap, Phone, Car, Clock, Building2, MapPin, 
    Sparkles, ArrowLeft, Loader2, ExternalLink, QrCode
} from 'lucide-react';
import { format } from 'date-fns';
import { QRCodeSVG } from 'qrcode.react';
import { domToPng } from 'modern-screenshot';
import DailyDigitalPass from '../student/DailyDigitalPass';
import { supabase } from '../../config/supabase';

const VisitorPassView = () => {
    const [passData, setPassData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const passRef = useRef(null);

    // Live clock updater
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Parse pass data from URL
    useEffect(() => {
        const loadPassData = async () => {
            try {
                const params = new URLSearchParams(window.location.search);
                const rawData = params.get('data');
                const passId = params.get('id');

                let parsed = null;

                if (rawData) {
                    try {
                        const decodedStr = decodeURIComponent(escape(atob(rawData)));
                        parsed = JSON.parse(decodedStr);
                    } catch (e) {
                        try {
                            parsed = JSON.parse(atob(rawData));
                        } catch (err) {
                            console.warn("Base64 parse error, trying direct json:", err);
                        }
                    }
                }

                // If not in data param or need fresh check, check Supabase movement_logs
                if (!parsed && passId) {
                    const { data: log } = await supabase
                        .from('movement_logs')
                        .select('*')
                        .eq('student_id', passId)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .maybeSingle();

                    if (log) {
                        const isParent = log.student_id?.startsWith('PRNT-') || log.student_id?.startsWith('VIS-') || log.user_name?.includes('[Visitor/Parent]');
                        const isJoiner = log.student_id?.startsWith('ADM-') || log.student_id?.startsWith('JOIN-') || log.user_name?.includes('[New Joining]');
                        const cleanName = log.user_name?.replace(/\[.*?\]/g, '').trim() || 'Visitor';

                        parsed = {
                            isVisitorPass: true,
                            passCategory: isParent ? 'PARENT' : isJoiner ? 'NEW_JOINING' : 'PARENT',
                            full_name: cleanName,
                            student_id: log.student_id,
                            purpose: 'Authorized Campus Visit',
                            verifiedAt: log.created_at || new Date().toISOString(),
                            status: log.status || 'Success',
                            gateName: 'Main Campus Gate'
                        };
                    }
                }

                // Default fallback if no data provided in dev/test
                if (!parsed) {
                    parsed = {
                        isVisitorPass: true,
                        passCategory: 'PARENT',
                        full_name: 'Campus Visitor',
                        student_id: passId || 'VIS-AUTH',
                        contact_number: 'N/A',
                        purpose: 'Official Campus Visit',
                        visiting_student: 'Campus Administration',
                        persons_count: '1',
                        vehicle_no: 'None',
                        departments: { name: 'Campus Administration' },
                        verifiedAt: new Date().toISOString(),
                        gateName: 'Main Gate'
                    };
                }

                setPassData(parsed);
            } catch (err) {
                console.error("Error loading visitor pass:", err);
            } finally {
                setLoading(false);
            }
        };

        loadPassData();
    }, []);

    const isParentVisitor = Boolean(
        passData?.passCategory === 'PARENT' ||
        passData?.student_id?.startsWith('PRNT-') ||
        passData?.student_id?.startsWith('VIS-') ||
        String(passData?.hostel_type || '').includes('Parent')
    );

    const isNewJoiner = Boolean(
        passData?.passCategory === 'NEW_JOINING' ||
        passData?.student_id?.startsWith('ADM-') ||
        passData?.student_id?.startsWith('JOIN-') ||
        String(passData?.hostel_type || '').includes('New Joining')
    );

    const handleDownloadPass = async () => {
        if (!passRef.current || downloading) return;
        setDownloading(true);

        try {
            const dataUrl = await domToPng(passRef.current, {
                scale: 2,
                backgroundColor: '#ffffff',
                cacheBust: true
            });

            const fileName = `VisitorPass_${passData?.student_id || 'Guest'}_${format(new Date(), 'ddMMM')}.png`;

            if (navigator.share && /mobile|android|iphone|ipad/i.test(navigator.userAgent)) {
                try {
                    const res = await fetch(dataUrl);
                    const blob = await res.blob();
                    const file = new File([blob], fileName, { type: 'image/png' });
                    await navigator.share({ title: 'Vishnu Digital Visitor Pass', files: [file] });
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
            alert("Failed to download pass. Please try again.");
        } finally {
            setDownloading(false);
        }
    };

    const handleSharePass = () => {
        const url = window.location.href;
        const text = `Here is my official Vishnu Institute Visitor Pass: ${url}`;
        if (navigator.share) {
            navigator.share({ title: 'Vishnu Digital Visitor Pass', text, url }).catch(() => {});
        } else {
            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#f8f9fb] flex flex-col items-center justify-center p-6 text-center">
                <div className="w-12 h-12 border-4 border-[#f47c20] border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Loading Digital Visitor Pass...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8f9fb] text-gray-900 pb-20 font-sans">
            {/* Hidden Pass Canvas for High-Resolution PNG Capture */}
            <div className="absolute left-[-9999px] top-[-9999px] pointer-events-none">
                <DailyDigitalPass 
                    ref={passRef}
                    studentData={passData}
                    gateName={passData?.gateName || 'Main Campus Gate'}
                    verifiedAt={passData?.verifiedAt}
                    isExpired={false}
                    isVisitorPass={true}
                    isParentVisitor={isParentVisitor}
                    isNewJoiner={isNewJoiner}
                />
            </div>

            {/* Top Header */}
            <header className="bg-white border-b border-gray-100 sticky top-0 z-40 px-6 py-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#f47c20] to-[#e76f51] flex items-center justify-center text-white font-black shadow-md shadow-orange-500/20">
                        <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-sm font-black text-[#1a2b3c] tracking-tight leading-none uppercase">
                            Vishnu Institute of Technology
                        </h1>
                        <p className="text-[10px] font-bold text-[#f47c20] uppercase tracking-widest mt-0.5">
                            {isParentVisitor ? 'Parent / Visitor Pass' : isNewJoiner ? 'New Admission Pass' : 'Digital Gate Pass'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider">Active</span>
                </div>
            </header>

            <main className="max-w-md mx-auto px-5 pt-6 space-y-6">
                {/* Live Verification Badge Card */}
                <div className="bg-gradient-to-br from-[#1a2b3c] via-[#243b55] to-[#141e30] rounded-[36px] p-6 text-white shadow-2xl relative overflow-hidden text-center">
                    <div className="absolute -right-10 -bottom-10 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
                    <div className="absolute left-0 top-0 w-24 h-24 bg-[#f47c20]/20 rounded-full blur-xl pointer-events-none" />

                    {/* Category Label */}
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 backdrop-blur-md mb-4 text-[10px] font-black tracking-widest uppercase">
                        {isParentVisitor ? <Users className="w-3.5 h-3.5 text-[#f47c20]" /> : <GraduationCap className="w-3.5 h-3.5 text-purple-400" />}
                        <span>{isParentVisitor ? 'Outer Parent / Visitor' : isNewJoiner ? 'New Admission Member' : 'Campus Guest'}</span>
                    </div>

                    {/* Avatar Icon */}
                    <div className="w-24 h-24 rounded-full mx-auto mb-4 bg-gradient-to-br from-[#f47c20] to-[#e76f51] p-1 shadow-xl shadow-orange-500/25 flex items-center justify-center">
                        <div className="w-full h-full rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                            {isParentVisitor ? <Users className="w-12 h-12" /> : <GraduationCap className="w-12 h-12" />}
                        </div>
                    </div>

                    <h2 className="text-2xl font-black tracking-tight leading-tight uppercase">
                        {passData?.full_name || 'Visitor Name'}
                    </h2>
                    <p className="text-xs font-bold text-white/70 uppercase tracking-widest mt-1">
                        PASS ID: {passData?.student_id || 'VIS-2026'}
                    </p>

                    {/* Digital Live Clock */}
                    <div className="mt-5 p-3 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md flex items-center justify-center gap-3">
                        <Clock className="w-4 h-4 text-[#f47c20] animate-pulse" />
                        <span className="text-xs font-black tracking-widest uppercase">
                            LIVE: {format(currentTime, 'hh:mm:ss a')} • {format(new Date(), 'dd MMM yyyy')}
                        </span>
                    </div>
                </div>

                {/* Visitor Pass Information Box */}
                <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                        <h3 className="text-xs font-black text-[#f47c20] uppercase tracking-[0.2em]">
                            Pass Authorization Details
                        </h3>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 uppercase">
                            Authorized Entry
                        </span>
                    </div>

                    <div className="space-y-3.5 text-xs">
                        {isParentVisitor ? (
                            <>
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-gray-400 uppercase tracking-wider">Visitor Name:</span>
                                    <span className="font-black text-[#1a2b3c]">{passData?.full_name}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-gray-400 uppercase tracking-wider">Contact Number:</span>
                                    <span className="font-black text-slate-700">{passData?.contact_number || 'N/A'}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-gray-400 uppercase tracking-wider">Visiting Ward / Student:</span>
                                    <span className="font-black text-[#f47c20]">{passData?.visiting_student || 'Campus Official'}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-gray-400 uppercase tracking-wider">Purpose of Visit:</span>
                                    <span className="font-black text-[#1a2b3c]">{passData?.purpose || 'Campus Visit'}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-gray-400 uppercase tracking-wider">Total Persons:</span>
                                    <span className="font-black text-slate-700">{passData?.persons_count ? `${passData.persons_count} Person(s)` : '1 Person'}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-gray-400 uppercase tracking-wider">Vehicle / ID Proof:</span>
                                    <span className="font-black text-slate-700">{passData?.vehicle_no || 'None'}</span>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-gray-400 uppercase tracking-wider">Candidate Name:</span>
                                    <span className="font-black text-[#1a2b3c]">{passData?.full_name}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-gray-400 uppercase tracking-wider">Contact Number:</span>
                                    <span className="font-black text-slate-700">{passData?.contact_number || 'N/A'}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-gray-400 uppercase tracking-wider">Department / Stream:</span>
                                    <span className="font-black text-purple-700">{passData?.departments?.name || 'Engineering'}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-gray-400 uppercase tracking-wider">Application / Temp ID:</span>
                                    <span className="font-black text-slate-700">{passData?.application_no || passData?.student_id || 'N/A'}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-gray-400 uppercase tracking-wider">Purpose:</span>
                                    <span className="font-black text-[#f47c20]">{passData?.purpose || 'New Admission / Reporting'}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-gray-400 uppercase tracking-wider">Accompanying Persons:</span>
                                    <span className="font-black text-slate-700">{passData?.persons_count ? `${passData.persons_count} Person(s)` : '1 Person'}</span>
                                </div>
                            </>
                        )}

                        <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                            <span className="font-bold text-gray-400 uppercase tracking-wider">Entry Point:</span>
                            <span className="font-black text-[#1a2b3c]">{passData?.gateName || 'Main Campus Gate'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="font-bold text-gray-400 uppercase tracking-wider">Pass Validity:</span>
                            <span className="font-black text-emerald-700">Valid Today Until 11:59 PM</span>
                        </div>
                    </div>
                </div>

                {/* Primary Action Buttons */}
                <div className="space-y-3 pt-2">
                    <button
                        onClick={handleDownloadPass}
                        disabled={downloading}
                        className="w-full py-4 bg-gradient-to-r from-[#f47c20] to-[#e06b12] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-orange-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                        {downloading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Generating Pass Image...</span>
                            </>
                        ) : (
                            <>
                                <Download className="w-4 h-4" />
                                <span>Download Pass to Gallery / Files</span>
                            </>
                        )}
                    </button>

                    <button
                        onClick={handleSharePass}
                        className="w-full py-4 bg-white hover:bg-gray-50 border border-gray-200 text-[#1a2b3c] rounded-2xl font-black text-xs uppercase tracking-widest shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                        <Share2 className="w-4 h-4 text-[#f47c20]" />
                        <span>Share Pass via WhatsApp / Link</span>
                    </button>
                </div>

                {/* Security Footer Notice */}
                <div className="p-4 bg-orange-50/60 rounded-2xl border border-orange-100 text-center">
                    <p className="text-[10px] font-black text-[#f47c20] uppercase tracking-wider mb-1">
                        Campus Security & Verification
                    </p>
                    <p className="text-[9px] text-gray-500 font-medium leading-relaxed">
                        Please keep this digital pass accessible on your phone while on campus. Present this pass upon request by security or faculty personnel.
                    </p>
                </div>
            </main>
        </div>
    );
};

export default VisitorPassView;
