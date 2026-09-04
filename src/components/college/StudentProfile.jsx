import React, { useState, useEffect } from 'react';
import {
    ChevronLeft, User, GraduationCap, Mail, Phone, MapPin,
    Calendar, Shield, Clock, ArrowUpRight, Loader2,
    CalendarDays, Hash, BadgeCheck, Building, Eye
} from 'lucide-react';
import { supabase } from '../../config/supabase';
import { format, formatDistanceToNow } from 'date-fns';
import VerificationResult from '../student/VerificationResult';

const StatusBadge = ({ status }) => {
    const styles = {
        Active: 'bg-emerald-50 text-emerald-600 border-emerald-200',
        'On Leave': 'bg-amber-50 text-amber-600 border-amber-200',
        Graduated: 'bg-gray-100 text-gray-500 border-gray-200',
        Inactive: 'bg-rose-50 text-rose-600 border-rose-200',
    };
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${styles[status] || styles.Active}`}>
            {status || 'Active'}
        </span>
    );
};

const InfoCard = ({ icon: HeroIcon, label, value }) => (
    <div className="flex items-start gap-4 p-4 rounded-2xl bg-white border border-gray-50 shadow-sm">
        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
            <HeroIcon className="w-5 h-5 text-[#f47c20]" />
        </div>
        <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">{label}</p>
            <p className="text-sm font-bold text-gray-900">{value || 'N/A'}</p>
        </div>
    </div>
);

const StudentProfile = ({ collegeData, studentId, onBack }) => {
    const [student, setStudent] = useState(null);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showPassCard, setShowPassCard] = useState(false);
    const [selectedLogForPass, setSelectedLogForPass] = useState(null);

    useEffect(() => {
        if (studentId) fetchData();
    }, [studentId]);

    const fetchData = async () => {
        try {
            setLoading(true);

            // Fetch student from Supabase
            const { data: studentRow, error } = await supabase
                .from('students')
                .select('*, departments(name)')
                .or(`id.eq.${studentId},student_id.eq.${studentId}`)
                .maybeSingle();

            if (studentRow) {
                const sData = {
                    ...studentRow,
                    name: studentRow.full_name,
                    rollNumber: studentRow.student_id,
                    department: studentRow.departments?.name || studentRow.department_id || 'General',
                    year: studentRow.year_of_study,
                    hostel: studentRow.hostel_type
                };
                setStudent(sData);

                // Fetch movement logs for this student
                const sIdentifier = studentRow.student_id || studentRow.id;
                const { data: movementLogs } = await supabase
                    .from('movement_logs')
                    .select('*')
                    .eq('student_id', sIdentifier)
                    .order('created_at', { ascending: false })
                    .limit(20);

                if (movementLogs) {
                    setLogs(movementLogs);
                }
            }
        } catch (err) {
            console.error('Error fetching student profile:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-gray-400">
                <Loader2 className="w-10 h-10 animate-spin text-[#f47c20] mb-4" />
                <p className="text-sm font-bold">Assembling student dossier...</p>
            </div>
        );
    }

    if (!student) {
        return (
            <div className="flex-1 p-8 text-center">
                <p className="text-red-500 font-bold">Student record not found.</p>
                <button onClick={onBack} className="mt-4 text-[#f47c20] font-bold">Go Back</button>
            </div>
        );
    }

    const studentName = student.full_name || student.name || 'Student';
    const sIdDisplay = student.student_id || student.rollNumber || student.studentId || 'N/A';
    const initials = studentName
        ? studentName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
        : 'ST';

    // Helper display formatters
    const formatJoinDate = () => {
        const val = student.created_at || student.createdAt;
        if (!val) return 'N/A';
        try {
            if (val?.toDate) return format(val.toDate(), 'MMM yyyy');
            const d = new Date(val);
            if (!isNaN(d.getTime())) return format(d, 'MMM yyyy');
        } catch (e) {}
        return 'N/A';
    };

    const formatGender = () => {
        const g = student.gender;
        if (!g || g === 'Not specified') return 'N/A';
        return g.charAt(0).toUpperCase() + g.slice(1).toLowerCase();
    };

    const formatHostel = () => {
        const h = student.hostel_type || student.hostel;
        if (!h) return 'Dayscholar';
        const lower = h.toLowerCase();
        if (lower === 'dayscholar' || lower === 'day scholar') return 'Dayscholar';
        if (lower === 'hosteler' || lower === 'hosteller') return 'Hosteler';
        return h;
    };

    const formatBatch = () => {
        const b = student.batch;
        if (!b) return 'Batch 2024';
        if (b.startsWith('batch_')) return 'Batch 2028';
        if (b.startsWith('Batch ')) return b;
        return `Batch ${b}`;
    };

    return (
        <div className="flex-1 overflow-y-auto p-8 bg-[#f8f9fb]">
            {/* Header / Back Button */}
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={onBack}
                    className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-all shadow-sm active:scale-95"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <div>
                    <h1 className="text-2xl font-black text-gray-900">Student Profile</h1>
                    <p className="text-sm text-gray-500 font-medium">Detailed academic and movement record.</p>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-8">
                {/* Left Column - Profile Card */}
                <div className="col-span-12 lg:col-span-4 space-y-6">
                    <div className="bg-white rounded-[32px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
                        <div className="h-32 bg-gradient-to-br from-[#f47c20] to-[#e06d1c] relative">
                            <div className="absolute -bottom-16 left-1/2 -translate-x-1/2">
                                {student.photo_url || student.photoUrl ? (
                                    <img
                                        src={student.photo_url || student.photoUrl}
                                        alt={studentName}
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                            const parent = e.target.parentElement;
                                            if (parent) {
                                                const fallback = parent.querySelector('.initials-fallback');
                                                if (fallback) fallback.style.display = 'flex';
                                            }
                                        }}
                                        className="w-32 h-32 rounded-[24px] border-4 border-white object-cover shadow-xl bg-white"
                                    />
                                ) : null}
                                <div
                                    className="initials-fallback w-32 h-32 rounded-[24px] border-4 border-white bg-[#f47c20] flex items-center justify-center text-white text-3xl font-black shadow-xl"
                                    style={{ display: (student.photo_url || student.photoUrl) ? 'none' : 'flex' }}
                                >
                                    {initials}
                                </div>
                            </div>
                        </div>

                        <div className="pt-20 pb-8 px-8 text-center">
                            <h2 className="text-2xl font-black text-gray-900 mb-1">{studentName}</h2>
                            <p className="text-gray-400 font-bold text-sm tracking-wide mb-4">ID: {sIdDisplay}</p>
                            <StatusBadge status={student.status} />

                            <div className="mt-8 pt-8 border-t border-gray-50 grid grid-cols-2 gap-4">
                                <div className="text-center">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Logs</p>
                                    <p className="text-xl font-black text-gray-900">{logs.length}+</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Join Date</p>
                                    <p className="text-sm font-black text-gray-900">{formatJoinDate()}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Access ID / Pass Preview Placeholder */}
                    <div 
                        onClick={() => setShowPassCard(true)}
                        className="bg-white rounded-[32px] p-6 text-gray-900 border border-gray-100 overflow-hidden relative group cursor-pointer shadow-[0_4px_20px_rgba(0,0,0,0.02)] active:scale-[0.99] transition-all"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50/50 rounded-full -translate-y-16 translate-x-16 blur-2xl group-hover:bg-orange-100/50 transition-all" />
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-8">
                                <BadgeCheck className="w-8 h-8 text-[#f47c20]" />
                                <div className="w-10 h-10 bg-orange-50 border border-orange-100 rounded-xl flex items-center justify-center">
                                    <Shield className="w-5 h-5 text-[#f47c20]" />
                                </div>
                            </div>
                            <h3 className="text-lg font-black mb-1">Digital Identity Pass</h3>
                            <p className="text-gray-400 text-xs font-medium mb-6 uppercase tracking-widest">VP-SECURED-SYSTEM</p>
                            <div className="bg-gray-50 rounded-2xl p-4 flex items-center justify-center border border-gray-100 group-hover:border-orange-200 transition-colors">
                                <p className="text-sm font-bold text-gray-600 group-hover:text-[#f47c20]">View Digital Pass Card</p>
                                <ArrowUpRight className="w-4 h-4 ml-2 text-[#f47c20]" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column - Details */}
                <div className="col-span-12 lg:col-span-8 space-y-8">
                    {/* Information Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="col-span-full mb-2">
                            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <User className="w-4 h-4" /> Personal Information
                            </h3>
                        </div>
                        <InfoCard icon={Mail} label="Email Address" value={student.email} />
                        <InfoCard icon={Phone} label="Contact Number" value={student.contact_number || student.contactNumber} />
                        <InfoCard icon={CalendarDays} label="Gender" value={formatGender()} />
                        <InfoCard icon={Building} label="Hostel / Living" value={formatHostel()} />
                        <InfoCard icon={MapPin} label="Home Region" value="Local Campus" />

                        <div className="col-span-full mt-4 mb-2">
                            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <GraduationCap className="w-4 h-4" /> Academic Details
                            </h3>
                        </div>
                        <InfoCard icon={Hash} label="Current Year" value={`${student.year_of_study || student.year || '1'}st Year`} />
                        <InfoCard icon={Calendar} label="Joining Batch" value={formatBatch()} />
                        <div className="col-span-full">
                            <InfoCard icon={Building} label="Department" value={student.departments?.name || student.department || 'General Dept'} />
                        </div>
                    </div>

                    {/* Movement History */}
                    <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Clock className="w-5 h-5 text-[#f47c20]" />
                                <h3 className="font-bold text-gray-900">Recent Movement History</h3>
                            </div>
                            <span className="text-xs font-bold text-gray-400 tracking-wider">CLICK TO VIEW PASS</span>
                        </div>
                        <div className="p-0 overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="bg-gray-50/50">
                                        <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Gate / Point</th>
                                        <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Activity</th>
                                        <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Datetime</th>
                                        <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Time Ago</th>
                                        <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {logs.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="px-8 py-12 text-center text-gray-400 font-bold">
                                                No movement records detected for this student.
                                            </td>
                                        </tr>
                                    ) : (
                                        logs.map((log) => (
                                            <tr 
                                                key={log.id} 
                                                onClick={() => {
                                                    setSelectedLogForPass(log);
                                                    setShowPassCard(true);
                                                }}
                                                className="hover:bg-orange-50/40 transition-colors cursor-pointer group"
                                            >
                                                <td className="px-8 py-4 font-bold text-gray-900 group-hover:text-[#f47c20] transition-colors">{log.gateName || log.gateId || log.gate_id || 'Gate 1'}</td>
                                                <td className="px-8 py-4">
                                                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${log.movementType === 'IN' || log.movementType === 'AUTHORIZED' || log.movement_type === 'IN' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'
                                                        }`}>
                                                        {log.movementType || log.movement_type || 'AUTHORIZED'}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-4 text-gray-500 font-medium">
                                                    {log.scannedAt?.toDate ? format(log.scannedAt.toDate(), 'dd MMM, hh:mm a') : log.created_at ? format(new Date(log.created_at), 'dd MMM, hh:mm a') : 'N/A'}
                                                </td>
                                                <td className="px-8 py-4 text-[#f47c20] font-bold">
                                                    {log.scannedAt?.toDate ? formatDistanceToNow(log.scannedAt.toDate(), { addSuffix: true }) : log.created_at ? formatDistanceToNow(new Date(log.created_at), { addSuffix: true }) : 'N/A'}
                                                </td>
                                                <td className="px-8 py-4 text-right">
                                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-[#f47c20] bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-100 group-hover:bg-[#f47c20] group-hover:text-white transition-all">
                                                        <Eye className="w-3.5 h-3.5" />
                                                        Pass
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Verification / Pass Card Slide-over */}
            {showPassCard && (
                <div 
                    className="fixed inset-0 z-[100] flex justify-end bg-black/50 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
                    onClick={() => {
                        setShowPassCard(false);
                        setSelectedLogForPass(null);
                    }}
                >
                    <div 
                        className="w-[480px] max-w-full bg-white h-full shadow-2xl animate-in slide-in-from-right duration-300 overflow-y-auto relative flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        <VerificationResult 
                            studentData={{
                                ...student,
                                full_name: student?.full_name || student?.name,
                                student_id: student?.student_id || student?.rollNumber,
                                departments: student?.departments || { name: student?.department || 'Computer Science Engineering' }
                            }}
                            gateName={selectedLogForPass?.gateName || selectedLogForPass?.gateId || selectedLogForPass?.gate_id || 'Main Campus Gate'}
                            verifiedAt={selectedLogForPass?.created_at ? format(new Date(selectedLogForPass.created_at), 'hh:mm a') : format(new Date(), 'hh:mm a')}
                            onNextScan={() => {
                                setShowPassCard(false);
                                setSelectedLogForPass(null);
                            }}
                            warning={selectedLogForPass?.warning}
                            status={selectedLogForPass?.status}
                            hideNavBar={true}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentProfile;
