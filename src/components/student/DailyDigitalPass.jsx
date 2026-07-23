import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';

const DailyDigitalPass = React.forwardRef(({ studentData, gateName, verifiedAt, photoUrl, isExpired = false }, ref) => {
    const initials = studentData?.full_name
        ? studentData.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
        : 'ST';

    const fullName = studentData?.full_name || 'Vishnu Student';
    const deptFull = studentData?.departments?.name || 'Department';
    
    // Smart Dept Shortener
    let deptShort = 'DEPT';
    if (deptFull) {
        const match = deptFull.match(/\(([^)]+)\)/);
        if (match && match[1]) {
            deptShort = match[1];
        } else {
            deptShort = deptFull.split(/\s+/).map(word => {
                const lWord = word.toLowerCase();
                if (lWord === 'and' || lWord === '&') return '&';
                if (['of', 'for', 'the'].includes(lWord)) return '';
                return word[0];
            }).join('');
        }
        deptShort = deptShort.toUpperCase().replace(/[^A-Z0-9&]/g, '');
    }

    const todayDate = format(new Date(), 'dd MMM yyyy');
    const expiryTime = "05:00 PM";

    return (
        <div ref={ref} className="w-[400px] bg-white p-8 flex flex-col items-center relative overflow-hidden" style={{ borderRadius: '56px' }}>
            {/* Institution Branding */}
            <div className="w-full text-center mb-8 pt-2">
                <h1 className="text-[#1a2b3c] font-[900] text-[24px] tracking-tighter leading-none uppercase">
                    Vishnu Institute of Technology
                </h1>
                <p className={`font-black text-[10px] tracking-[0.4em] mt-2 opacity-80 uppercase ${isExpired ? 'text-rose-500' : 'text-[#f47c20]'}`}>
                    Daily Digital Pass {isExpired ? '(Expired)' : ''}
                </p>
                <div className={`h-[2px] w-16 mx-auto mt-3 rounded-full opacity-60 ${isExpired ? 'bg-rose-500' : 'bg-[#f47c20]'}`} />
            </div>

            {/* Main Pass Container */}
            <div className={`w-full rounded-[44px] p-8 border relative z-10 transition-colors ${isExpired ? 'bg-rose-50 border-rose-200 shadow-rose-100/50' : 'bg-slate-50 border-slate-100 shadow-sm'}`}>
                {/* Identity Header */}
                <div className={`flex items-center gap-6 mb-8 pb-8 border-b ${isExpired ? 'border-rose-200/50' : 'border-slate-200/50'}`}>
                    <div className="w-20 h-20 rounded-[22px] overflow-hidden flex-shrink-0 shadow-md border-2 border-white bg-[#fad6bd]">
                        {photoUrl ? (
                            <img src={photoUrl} crossOrigin="anonymous" alt="Profile" className={`w-full h-full object-cover ${isExpired ? 'grayscale-[0.4]' : ''}`} />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#f47c20] font-black text-2xl">{initials}</div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className={`font-[900] text-[20px] leading-tight break-words uppercase ${isExpired ? 'text-rose-900' : 'text-[#1a2b3c]'}`}>{fullName}</h2>
                        <p className={`font-bold text-[11px] tracking-widest mt-1 uppercase ${isExpired ? 'text-rose-400' : 'text-slate-400'}`}>ID: {studentData?.student_id || 'N/A'}</p>
                        <div className="mt-2 flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-black border uppercase ${isExpired ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-white text-[#7e22ce] border-purple-100'}`}>{deptShort}</span>
                            <span className={`text-[9px] font-bold uppercase tracking-widest ${isExpired ? 'text-rose-300' : 'text-slate-400'}`}>BATCH {studentData?.batch || 'N/A'}</span>
                        </div>
                    </div>
                </div>

                {/* Core Attributes */}
                <div className={`grid grid-cols-2 gap-x-8 gap-y-6 pb-8 mb-8 border-b ${isExpired ? 'border-rose-200/50' : 'border-slate-200/50'}`}>
                    <div className="col-span-2">
                        <p className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 opacity-60 ${isExpired ? 'text-rose-400' : 'text-slate-400'}`}>Official Email</p>
                        <p className={`text-[14px] font-[900] truncate break-all ${isExpired ? 'text-rose-900' : 'text-[#1a2b3c]'}`}>{studentData?.email || 'N/A'}</p>
                    </div>
                    <div>
                        <p className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 opacity-60 ${isExpired ? 'text-rose-400' : 'text-slate-400'}`}>Contact</p>
                        <p className={`text-[14px] font-[900] ${isExpired ? 'text-rose-900' : 'text-[#1a2b3c]'}`}>{studentData?.contact_number || 'N/A'}</p>
                    </div>
                    <div>
                        <p className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 opacity-60 ${isExpired ? 'text-rose-400' : 'text-slate-400'}`}>Gender</p>
                        <p className={`text-[14px] font-[900] uppercase ${isExpired ? 'text-rose-900' : 'text-[#1a2b3c]'}`}>{studentData?.gender || 'N/A'}</p>
                    </div>
                    <div>
                        <p className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 opacity-60 ${isExpired ? 'text-rose-400' : 'text-slate-400'}`}>Logistics</p>
                        <p className={`text-[14px] font-[900] ${isExpired ? 'text-rose-900' : 'text-[#1a2b3c]'}`}>{studentData?.hostel || 'Day Scholar'}</p>
                    </div>
                    <div>
                        <p className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 opacity-60 ${isExpired ? 'text-rose-400' : 'text-slate-400'}`}>Campus</p>
                        <p className={`text-[14px] font-[900] ${isExpired ? 'text-rose-900' : 'text-[#1a2b3c]'}`}>{studentData?.campus || 'Main Campus'}</p>
                    </div>
                </div>

                {/* Footer Security */}
                <div className="mt-8 pt-8 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-[#7e22ce]"><ShieldCheck className="w-6 h-6" /></div>
                        <div>
                            <p className="text-[#7e22ce] font-black text-[11px] leading-none mb-0.5 uppercase tracking-tighter">Verified VID</p>
                            <p className="text-slate-400 font-bold text-[8px] uppercase tracking-[0.2em]">Institutional Auth</p>
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
