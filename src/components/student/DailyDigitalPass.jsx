import React from 'react';
import { ShieldCheck, Users, GraduationCap, Building2, XCircle } from 'lucide-react';
import { format } from 'date-fns';

const DailyDigitalPass = React.forwardRef(({ 
    studentData, 
    gateName, 
    verifiedAt, 
    photoUrl, 
    isExpired = false,
    isDenied = false,
    denialReason = null,
    isVisitorPass = false,
    isParentVisitor = false,
    isNewJoiner = false
}, ref) => {
    const initials = studentData?.full_name
        ? studentData.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
        : (isParentVisitor ? 'VP' : isNewJoiner ? 'NJ' : 'ST');

    const fullName = studentData?.full_name || (isVisitorPass ? 'Campus Visitor' : 'Vishnu Student');
    const deptFull = studentData?.departments?.name || studentData?.department_name || studentData?.department || 'Department';
    
    // Smart Dept Shortener
    let deptShort = 'DEPT';
    if (deptFull && deptFull !== 'Department') {
        const match = deptFull.match(/\(([^)]+)\)/);
        if (match && match[1]) {
            deptShort = match[1];
        } else {
            deptShort = deptFull.split(/\s+/).map(word => {
                const lWord = word.toLowerCase();
                if (lWord === 'and' || lWord === '&') return '&';
                if (['of', 'for', 'the', 'in', 'at'].includes(lWord)) return '';
                return word[0];
            }).join('');
        }
        deptShort = deptShort.toUpperCase().replace(/[^A-Z0-9&]/g, '');
        if (deptShort.length < 2) deptShort = deptFull.substring(0, 4).toUpperCase();
    }

    const rawGate = gateName || studentData?.gateName || studentData?.guard_gates?.name;
    const formattedGate = rawGate ? String(rawGate).replace(/\b\w/g, c => c.toUpperCase()) : 'Main Campus Gate';

    const todayDate = format(new Date(), 'dd MMM yyyy');

    return (
        <div ref={ref} className="w-[400px] bg-white p-8 flex flex-col items-center relative overflow-hidden" style={{ borderRadius: '56px' }}>
            {/* Institution Branding */}
            <div className="w-full text-center mb-8 pt-2">
                <h1 className="text-[#1a2b3c] font-[900] text-[24px] tracking-tighter leading-none uppercase">
                    Vishnu Institute of Technology
                </h1>
                <p className={`font-black text-[10px] tracking-[0.4em] mt-2 opacity-80 uppercase ${
                    isDenied ? 'text-rose-600' : isExpired ? 'text-rose-500' : isParentVisitor ? 'text-amber-600' : isNewJoiner ? 'text-purple-600' : 'text-[#f47c20]'
                }`}>
                    {isDenied ? 'ACCESS DENIED (LIMIT REACHED)' : isParentVisitor ? 'Official Visitor Gate Pass' : isNewJoiner ? 'New Admission Entry Pass' : `Daily Digital Pass ${isExpired ? '(Expired)' : ''}`}
                </p>
                <div className={`h-[2px] w-16 mx-auto mt-3 rounded-full opacity-60 ${
                    isDenied ? 'bg-rose-600' : isExpired ? 'bg-rose-500' : isParentVisitor ? 'bg-amber-500' : isNewJoiner ? 'bg-purple-600' : 'bg-[#f47c20]'
                }`} />
            </div>

            {/* Main Pass Container */}
            <div className={`w-full rounded-[44px] p-8 border relative z-10 transition-colors ${
                isDenied
                    ? 'bg-rose-50 border-rose-300 shadow-rose-100/50'
                    : isExpired 
                        ? 'bg-rose-50 border-rose-200 shadow-rose-100/50' 
                        : isParentVisitor 
                            ? 'bg-amber-50/40 border-amber-200 shadow-sm'
                            : isNewJoiner
                                ? 'bg-purple-50/40 border-purple-200 shadow-sm'
                                : 'bg-slate-50 border-slate-100 shadow-sm'
            }`}>
                {/* Denial Alert Ribbon */}
                {isDenied && (
                    <div className="bg-rose-600 text-white rounded-2xl p-3 mb-6 flex items-center gap-3 shadow-md">
                        <XCircle className="w-6 h-6 flex-shrink-0 text-white" />
                        <div>
                            <p className="font-black text-[11px] uppercase tracking-wider leading-tight">Access Denied</p>
                            <p className="text-[9px] font-bold opacity-90 leading-tight mt-0.5">{denialReason || 'Monthly pass limit reached by college policy'}</p>
                        </div>
                    </div>
                )}

                {/* Identity Header */}
                <div className={`flex items-center gap-6 mb-8 pb-8 border-b ${
                    isDenied || isExpired ? 'border-rose-200/50' : isParentVisitor ? 'border-amber-200/50' : isNewJoiner ? 'border-purple-200/50' : 'border-slate-200/50'
                }`}>
                    <div className={`w-20 h-20 rounded-[22px] overflow-hidden flex-shrink-0 shadow-md border-2 ${
                        isDenied ? 'border-rose-400 bg-rose-100' : 'border-white bg-[#fad6bd]'
                    }`}>
                        {photoUrl ? (
                            <img src={photoUrl} crossOrigin="anonymous" alt="Profile" className={`w-full h-full object-cover ${isDenied ? 'grayscale' : isExpired ? 'grayscale-[0.4]' : ''}`} />
                        ) : isParentVisitor ? (
                            <div className="w-full h-full bg-gradient-to-br from-amber-400 to-[#f47c20] flex items-center justify-center text-white font-black text-2xl">
                                <Users className="w-10 h-10" />
                            </div>
                        ) : isNewJoiner ? (
                            <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-2xl">
                                <GraduationCap className="w-10 h-10" />
                            </div>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#f47c20] font-black text-2xl">{initials}</div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className={`font-[900] text-[20px] leading-tight break-words uppercase ${isDenied || isExpired ? 'text-rose-900' : 'text-[#1a2b3c]'}`}>{fullName}</h2>
                        <p className={`font-bold text-[11px] tracking-widest mt-1 uppercase ${
                            isDenied || isExpired ? 'text-rose-400' : isParentVisitor ? 'text-amber-700' : isNewJoiner ? 'text-purple-700' : 'text-slate-400'
                        }`}>
                            {isVisitorPass ? `PASS ID: ${studentData?.student_id || 'ACTIVE'}` : `ID: ${studentData?.student_id || 'N/A'}`}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-black border uppercase ${
                                isDenied
                                    ? 'bg-rose-100 text-rose-800 border-rose-300'
                                    : isExpired 
                                        ? 'bg-rose-100 text-rose-700 border-rose-200' 
                                        : isParentVisitor 
                                            ? 'bg-amber-100 text-amber-800 border-amber-200'
                                            : isNewJoiner 
                                                ? 'bg-purple-100 text-purple-800 border-purple-200'
                                                : 'bg-white text-[#7e22ce] border-purple-100'
                            }`}>
                                {isDenied ? 'DENIED / LIMIT REACHED' : isParentVisitor ? 'PARENT / VISITOR' : isNewJoiner ? 'NEW ADMISSION' : deptShort}
                            </span>
                            <span className={`text-[9px] font-bold uppercase tracking-widest ${isDenied || isExpired ? 'text-rose-400' : 'text-slate-400'}`}>
                                {isVisitorPass ? todayDate : `BATCH ${studentData?.batch || 'N/A'}`}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Core Attributes */}
                {isParentVisitor ? (
                    <div className="grid grid-cols-2 gap-x-8 gap-y-6 pb-8 mb-8 border-b border-amber-200/50">
                        <div className="col-span-2">
                            <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5 text-amber-800/70">Visiting Ward / Student</p>
                            <p className="text-[14px] font-[900] text-[#1a2b3c]">{studentData?.visiting_student || 'Campus Official / Faculty'}</p>
                        </div>
                        <div className="col-span-2">
                            <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5 text-amber-800/70">Purpose of Visit</p>
                            <p className="text-[14px] font-[900] text-[#f47c20]">{studentData?.purpose || 'Campus Visit'}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5 text-amber-800/70">Contact Number</p>
                            <p className="text-[14px] font-[900] text-[#1a2b3c]">{studentData?.contact_number || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5 text-amber-800/70">Total Persons</p>
                            <p className="text-[14px] font-[900] text-[#1a2b3c]">{studentData?.persons_count ? `${studentData.persons_count} Person(s)` : '1 Person'}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5 text-amber-800/70">Vehicle / ID</p>
                            <p className="text-[14px] font-[900] text-[#1a2b3c]">{studentData?.vehicle_no || 'None'}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5 text-amber-800/70">Entry Gate</p>
                            <p className="text-[14px] font-[900] text-[#1a2b3c]">{formattedGate}</p>
                        </div>
                    </div>
                ) : isNewJoiner ? (
                    <div className="grid grid-cols-2 gap-x-8 gap-y-6 pb-8 mb-8 border-b border-purple-200/50">
                        <div className="col-span-2">
                            <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5 text-purple-800/70">Department / Stream</p>
                            <p className="text-[14px] font-[900] text-[#1a2b3c]">{deptFull}</p>
                        </div>
                        <div className="col-span-2">
                            <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5 text-purple-800/70">Purpose / Action</p>
                            <p className="text-[14px] font-[900] text-[#f47c20]">{studentData?.purpose || 'New Admission / Reporting'}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5 text-purple-800/70">Contact Number</p>
                            <p className="text-[14px] font-[900] text-[#1a2b3c]">{studentData?.contact_number || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5 text-purple-800/70">Accompanying</p>
                            <p className="text-[14px] font-[900] text-[#1a2b3c]">{studentData?.persons_count ? `${studentData.persons_count} Person(s)` : '1 Person'}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5 text-purple-800/70">Entry Gate</p>
                            <p className="text-[14px] font-[900] text-[#1a2b3c]">{formattedGate}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5 text-purple-800/70">Status</p>
                            <p className="text-[14px] font-[900] text-purple-700">Reporting Active</p>
                        </div>
                    </div>
                ) : (
                    <div className={`grid grid-cols-2 gap-x-8 gap-y-6 pb-8 mb-8 border-b ${isDenied || isExpired ? 'border-rose-200/50' : 'border-slate-200/50'}`}>
                        <div className="col-span-2">
                            <p className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 opacity-60 ${isDenied || isExpired ? 'text-rose-400' : 'text-slate-400'}`}>Official Email</p>
                            <p className={`text-[14px] font-[900] truncate break-all ${isDenied || isExpired ? 'text-rose-900' : 'text-[#1a2b3c]'}`}>{studentData?.email || 'N/A'}</p>
                        </div>
                        <div>
                            <p className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 opacity-60 ${isDenied || isExpired ? 'text-rose-400' : 'text-slate-400'}`}>Contact</p>
                            <p className={`text-[14px] font-[900] ${isDenied || isExpired ? 'text-rose-900' : 'text-[#1a2b3c]'}`}>{studentData?.contact_number || 'N/A'}</p>
                        </div>
                        <div>
                            <p className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 opacity-60 ${isDenied || isExpired ? 'text-rose-400' : 'text-slate-400'}`}>Gender</p>
                            <p className={`text-[14px] font-[900] uppercase ${isDenied || isExpired ? 'text-rose-900' : 'text-[#1a2b3c]'}`}>{studentData?.gender || 'N/A'}</p>
                        </div>
                        <div>
                            <p className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 opacity-60 ${isDenied || isExpired ? 'text-rose-400' : 'text-slate-400'}`}>Entry Gate</p>
                            <p className={`text-[14px] font-[900] text-[#1a2b3c]`}>{formattedGate}</p>
                        </div>
                        <div>
                            <p className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 opacity-60 ${isDenied || isExpired ? 'text-rose-400' : 'text-slate-400'}`}>Logistics</p>
                            <p className={`text-[14px] font-[900] ${isDenied || isExpired ? 'text-rose-900' : 'text-[#1a2b3c]'}`}>{studentData?.hostel || studentData?.hostel_type || 'Day Scholar'}</p>
                        </div>
                    </div>
                )}

                {/* Footer Security */}
                <div className="mt-8 pt-8 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            isDenied
                                ? 'bg-rose-100 text-rose-700'
                                : isParentVisitor 
                                    ? 'bg-amber-100 text-amber-700' 
                                    : isNewJoiner 
                                        ? 'bg-purple-100 text-purple-700' 
                                        : 'bg-purple-50 text-[#7e22ce]'
                        }`}>
                            {isDenied ? <XCircle className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
                        </div>
                        <div>
                            <p className={`font-black text-[11px] leading-none mb-0.5 uppercase tracking-tighter ${
                                isDenied 
                                    ? 'text-rose-800'
                                    : isParentVisitor 
                                        ? 'text-amber-800' 
                                        : isNewJoiner 
                                            ? 'text-purple-800' 
                                            : 'text-[#7e22ce]'
                            }`}>
                                {isDenied ? 'ACCESS DENIED' : isVisitorPass ? 'Official Gate Auth' : 'Verified VID'}
                            </p>
                            <p className={`font-bold text-[8px] uppercase tracking-[0.2em] ${isDenied ? 'text-rose-400' : 'text-slate-400'}`}>
                                {isDenied ? 'Policy Violation Logged' : 'Institutional Security'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="w-full text-center mt-10 opacity-10 select-none">
                <p className="text-[#1a2b3c] font-black text-[12px] tracking-[0.5em] uppercase">vishnu pass auth</p>
            </div>
        </div>
    );
});

export default DailyDigitalPass;
