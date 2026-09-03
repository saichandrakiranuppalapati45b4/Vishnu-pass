import React, { useState, useEffect, useCallback } from 'react';
import { Shield, AlertTriangle, UserPlus, BarChart2, Zap, GraduationCap, FileText, CheckCircle2, Loader2, LogOut, Info, User, X, Calendar, MapPin, ChevronRight, Plus } from 'lucide-react';
import { useNotification } from '../../contexts/NotificationContext';
import { supabase } from '../../config/supabase';
import { formatDistanceToNow, format, isAfter, setHours, setMinutes } from 'date-fns';
import DailyDigitalPass from '../student/DailyDigitalPass';

const DashboardContent = ({ collegeData, onNavigate }) => {
    const { showNotification, showModal } = useNotification();
    const [stats, setStats] = useState({
        totalStudents: 0,
        totalGuards: 0,
        activePasses: 0,
        totalScans: 0
    });
    const [recentActivity, setRecentActivity] = useState([]);
    const [recentStudents, setRecentStudents] = useState([]);
    const [health, setHealth] = useState({
        apiGateway: 'Healthy',
        uptime: '99.99%',
        lastMaintenance: 'Recently'
    });
    const [efficiency, setEfficiency] = useState({
        avgWaitTime: '0.4m',
        scansPerHour: 24
    });
    const [activeStudentDetails, setActiveStudentDetails] = useState([]);
    const [showActiveDetails, setShowActiveDetails] = useState(false);
    const [selectedSession, setSelectedSession] = useState(null);
    const [showDossier, setShowDossier] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchDashboardData = useCallback(async (showLoading = true) => {
        if (showLoading) setLoading(true);
        try {
            // 1. Total Students Count & Recent Students
            const { count: studentsCount, data: recentStudentsData } = await supabase
                .from('students')
                .select('*', { count: 'exact' })
                .order('created_at', { ascending: false })
                .limit(5);

            if (recentStudentsData) {
                setRecentStudents(recentStudentsData.map(s => ({
                    ...s,
                    name: s.full_name,
                    rollNumber: s.student_id,
                    department: s.department_id || 'General',
                    year: s.year_of_study
                })));
            }

            // 2. Guards Count
            const { count: guardsCount } = await supabase
                .from('guards')
                .select('*', { count: 'exact', head: true });

            // 3. Movement Logs & Scans Count
            const { count: scansCount, data: recentLogs } = await supabase
                .from('movement_logs')
                .select('*', { count: 'exact' })
                .order('created_at', { ascending: false })
                .limit(5);

            if (recentLogs) {
                setRecentActivity(recentLogs);
            }

            // 4. Active Passes Today
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);

            const { data: todayLogs } = await supabase
                .from('movement_logs')
                .select('*')
                .gte('created_at', todayStart.toISOString())
                .order('created_at', { ascending: false });

            const activeList = todayLogs || [];
            setActiveStudentDetails(activeList);

            setStats({
                totalStudents: studentsCount || 0,
                totalGuards: guardsCount || 0,
                activePasses: activeList.length,
                totalScans: scansCount || 0
            });

            setHealth({
                apiGateway: 'Healthy',
                uptime: '99.99%',
                lastMaintenance: 'Live'
            });

        } catch (error) {
            console.error("Dashboard error:", error);
            setHealth(prev => ({ ...prev, apiGateway: 'Degraded' }));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDashboardData();

        const channel = supabase
            .channel('college-dashboard-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'movement_logs' }, () => {
                fetchDashboardData(false);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => {
                fetchDashboardData(false);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchDashboardData]);

    const handleClosePass = async (e, session) => {
        e.stopPropagation();
        const confirmed = await showModal({
            title: 'Manual Checkout',
            message: `Do you want to manually close the active pass for ${session.user_name || session.student_id}? This will record their exit from campus.`,
            confirmText: 'Close Pass',
            cancelText: 'Cancel',
            type: 'warning'
        });

        if (!confirmed) return;

        try {
            await supabase
                .from('movement_logs')
                .update({ status: 'Closed' })
                .eq('id', session.id);

            showNotification('Student pass has been closed.', 'success');
            fetchDashboardData(false);
        } catch (err) {
            console.error("Failed to close pass:", err);
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-gray-50/30">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-[#f47c20] animate-spin" />
                    <p className="text-sm font-semibold text-gray-500">Synchronizing live portal data...</p>
                </div>
            </div>
        );
    }
    return (
        <div className="flex-1 overflow-y-auto p-8">
            {/* Stats */}
            <div className="grid grid-cols-4 gap-5 mb-8">
                {/* Total Students */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                    <div className="flex items-center justify-between mb-4">
                        <GraduationCap className="w-5 h-5 text-[#f47c20] opacity-80" />
                        <span className="text-[11px] font-bold text-emerald-500 bg-emerald-50 px-2.5 py-1 rounded-full">+2.5%</span>
                    </div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.05em] mb-1">Total Students</p>
                    <h3 className="text-[26px] font-bold text-gray-900 leading-tight">{stats.totalStudents.toLocaleString()}</h3>
                </div>

                {/* Total Guards */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                    <div className="flex items-center justify-between mb-4">
                        <Shield className="w-5 h-5 text-[#f47c20] opacity-80" />
                        <span className="text-[11px] font-bold text-red-500 bg-red-50 px-2.5 py-1 rounded-full">-1.2%</span>
                    </div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.05em] mb-1">Total Guards</p>
                    <h3 className="text-[26px] font-bold text-gray-900 leading-tight">{stats.totalGuards.toLocaleString()}</h3>
                </div>

                <div 
                    onClick={() => setShowActiveDetails(true)}
                    className="bg-white rounded-2xl p-6 border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] cursor-pointer hover:border-[#f47c20]/30 hover:shadow-md transition-all group active:scale-[0.98]"
                >
                    <div className="flex items-center justify-between mb-4">
                        <FileText className="w-5 h-5 text-[#f47c20] opacity-80 group-hover:text-[#f47c20] transition-colors" />
                        <span className="text-[11px] font-bold text-emerald-500 bg-emerald-50 px-2.5 py-1 rounded-full">+15%</span>
                    </div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.05em] mb-1">Active Passes</p>
                    <h3 className="text-[26px] font-bold text-gray-900 leading-tight group-hover:text-[#f47c20] transition-colors">{stats.activePasses.toLocaleString()}</h3>
                </div>

                {/* Total Scans */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                    <div className="flex items-center justify-between mb-4">
                        <Zap className="w-5 h-5 text-[#f47c20] opacity-80" />
                        <span className="text-[11px] font-bold text-emerald-500 bg-emerald-50 px-2.5 py-1 rounded-full">+4%</span>
                    </div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.05em] mb-1">Total Scans</p>
                    <h3 className="text-[26px] font-bold text-gray-900 leading-tight">{stats.totalScans.toLocaleString()}</h3>
                </div>
            </div>

            {/* Middle Row */}
            <div className="grid grid-cols-3 gap-6 mb-8">
                {/* Recent Activity */}
                <div className="col-span-2 bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
                    <div className="px-6 py-5 border-b border-gray-50 flex justify-between items-center">
                        <h3 className="font-bold text-gray-900 text-[16px]">Recent Activity</h3>
                        <button
                            onClick={() => onNavigate('reports')}
                            className="text-[13px] font-bold text-[#f47c20] hover:text-[#d96a18] transition-colors"
                        >
                            View All
                        </button>
                    </div>
                    <div className="p-0">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-[#f8f9fb]">
                                    <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Student</th>
                                    <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Gate</th>
                                    <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">Status</th>
                                    <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Timestamp</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {recentActivity.map((log) => (
                                    <tr
                                        key={log.id}
                                        className="hover:bg-gray-50/50 transition-colors group"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                {log.photoUrl ? (
                                                    <img src={log.photoUrl} alt="" className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-sm" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-[#f47c20] text-[10px] font-bold">
                                                        {log.studentName ? log.studentName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '??'}
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900 leading-tight">{log.studentName || 'Guest User'}</p>
                                                    <p className="text-[11px] text-gray-400 font-medium">ID: {log.studentId || 'N/A'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-semibold text-gray-700">{log.gateName || log.gateId || 'Gate'}</p>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {(() => {
                                                const s = (log.status || '').toLowerCase();
                                                const type = (log.movementType || '').toUpperCase();
                                                const isAuth = ['success', 'completed', 'approved'].includes(s) || (s === 'expired' && type === 'OUT');
                                                const isPending = s === 'pending';
                                                
                                                return (
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border ${isAuth ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : isPending ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${isAuth ? 'bg-emerald-500' : isPending ? 'bg-amber-500' : 'bg-rose-500'}`}></span>
                                                        {isAuth ? (s === 'expired' ? 'Checked Out' : 'Authorized') : isPending ? 'Pending' : 'Denied'}
                                                    </span>
                                                );
                                            })()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <p className="text-[11px] text-gray-500 font-medium whitespace-nowrap">
                                                {log.scannedAt?.toDate ? format(log.scannedAt.toDate(), 'MMM d, yyyy h:mm a') : 'N/A'}
                                            </p>
                                        </td>
                                    </tr>
                                ))}
                                {recentActivity.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-8 text-center text-gray-400 text-sm font-medium">No recent activity detected</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    {/* System Health */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-6">
                        <div className="flex items-center gap-2 mb-6">
                            <BarChart2 className="w-5 h-5 text-[#f47c20]" />
                            <h3 className="font-bold text-gray-900 text-[15px]">System Health</h3>
                        </div>

                        <div className="space-y-4 mb-8">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-500 font-medium">API Gateway</span>
                                <span className={`text-sm font-bold ${health.apiGateway === 'Healthy' ? 'text-emerald-500' : 'text-red-500'}`}>{health.apiGateway}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-500 font-medium">Server Uptime</span>
                                <span className="text-sm font-bold text-gray-900">{health.uptime}</span>
                            </div>
                        </div>

                        <div className="pt-5 border-t border-gray-50">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Last System Update</p>
                            <p className="text-[13px] font-bold text-gray-700">{health.lastMaintenance}</p>
                        </div>
                    </div>

                    {/* Gate Efficiency - Dark Card */}
                    <div className="bg-[#111827] rounded-2xl p-6 text-white shadow-lg relative overflow-hidden group">
                        <Zap className="absolute top-4 right-4 w-12 h-12 text-white/5 group-hover:text-white/10 transition-colors pointer-events-none" />

                        <div className="flex items-center gap-2 mb-8">
                            <CheckCircle2 className="w-5 h-5 text-[#f47c20]" />
                            <h3 className="font-bold text-[15px]">Gate Efficiency</h3>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Avg Wait Time</p>
                                <h4 className="text-2xl font-bold">{efficiency.avgWaitTime}</h4>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Scans / Hour</p>
                                <h4 className="text-2xl font-bold">{efficiency.scansPerHour}</h4>
                            </div>
                        </div>

                        <button
                            onClick={() => onNavigate('flow-optimization')}
                            className="w-full bg-[#f47c20] hover:bg-[#e06d1c] text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-lg active:scale-[0.98]"
                        >
                            Optimize Flow
                        </button>
                    </div>
                </div>
            </div>

            {/* Recently Registered Students Section */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden mb-8">
                <div className="px-6 py-5 border-b border-gray-50 flex justify-between items-center bg-white">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center text-[#f47c20]">
                            <GraduationCap className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 text-[16px]">Recently Registered Students</h3>
                            <p className="text-xs text-gray-400 font-medium">Student records saved in database</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => onNavigate('register-student')}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f47c20] hover:bg-[#e06d1c] text-white rounded-xl text-xs font-semibold transition-colors shadow-sm"
                        >
                            <UserPlus className="w-3.5 h-3.5" />
                            Register Student
                        </button>
                        <button
                            onClick={() => onNavigate('students')}
                            className="text-[13px] font-bold text-gray-500 hover:text-[#f47c20] transition-colors px-2 py-1"
                        >
                            View All
                        </button>
                    </div>
                </div>
                <div className="p-0">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-[#f8f9fb]">
                                <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Student Name & ID</th>
                                <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Department</th>
                                <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Batch / Year</th>
                                <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">Status</th>
                                <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Registered Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {recentStudents.map((student) => {
                                let formattedDate = 'Recently';
                                if (student.createdAt?.toDate) {
                                    formattedDate = format(student.createdAt.toDate(), 'MMM d, yyyy h:mm a');
                                } else if (student.created_at) {
                                    const d = new Date(student.created_at);
                                    if (!isNaN(d.getTime())) formattedDate = format(d, 'MMM d, yyyy h:mm a');
                                }
                                
                                const studentName = student.full_name || student.name || 'Student';
                                const initials = studentName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

                                return (
                                    <tr
                                        key={student.id || student.student_id}
                                        onClick={() => onNavigate('student-profile', student.id || student.student_id)}
                                        className="hover:bg-gray-50/50 transition-colors cursor-pointer group"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                {student.photo_url || student.photoUrl ? (
                                                    <img
                                                        src={student.photo_url || student.photoUrl}
                                                        alt=""
                                                        className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-sm"
                                                    />
                                                ) : (
                                                    <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center text-[#f47c20] text-xs font-bold">
                                                        {initials}
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900 leading-tight group-hover:text-[#f47c20] transition-colors">
                                                        {studentName}
                                                    </p>
                                                    <p className="text-[11px] text-gray-400 font-medium">
                                                        ID: {student.student_id || student.rollNumber || 'N/A'}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-semibold text-gray-700">
                                                {student.department || 'General'}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm text-gray-600 font-medium">
                                                {student.batch ? `Batch ${student.batch}` : `${student.year || student.year_of_study || 1} Year`}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border bg-emerald-50 text-emerald-600 border-emerald-100">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                {student.status || 'Active'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <p className="text-[11px] text-gray-500 font-medium whitespace-nowrap">
                                                {formattedDate}
                                            </p>
                                        </td>
                                    </tr>
                                );
                            })}
                            {recentStudents.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-gray-400 text-sm font-medium">
                                        No students registered yet in database.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Bottom Row - Quick Actions */}
            <div className="grid grid-cols-3 gap-6">
                <button
                    onClick={() => onNavigate('register-student')}
                    className="flex items-center gap-5 bg-[#f47c20] hover:bg-[#e06d1c] text-white rounded-2xl p-6 transition-all shadow-md group hover:translate-y-[-2px] active:scale-[0.98]"
                >
                    <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                        <UserPlus className="w-7 h-7" />
                    </div>
                    <div className="text-left">
                        <h4 className="font-bold text-[17px] mb-0.5">Register Student</h4>
                        <p className="text-xs text-white/80 font-medium">Add new student to portal</p>
                    </div>
                </button>

                <button className="flex items-center gap-5 bg-white hover:bg-gray-50 border border-gray-100 text-gray-900 rounded-2xl p-6 transition-all shadow-sm group hover:translate-y-[-2px] active:scale-[0.98]">
                    <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                        <Zap className="w-7 h-7 text-[#f47c20]" />
                    </div>
                    <div className="text-left">
                        <h4 className="font-bold text-[17px] mb-0.5 text-gray-900">Issue Emergency Pass</h4>
                        <p className="text-xs text-gray-400 font-medium">Generate temporary security QR</p>
                    </div>
                </button>

                <button
                    onClick={() => onNavigate('reports')}
                    className="flex items-center gap-5 bg-white hover:bg-gray-50 border border-gray-100 text-gray-900 rounded-2xl p-6 transition-all shadow-sm group hover:translate-y-[-2px] active:scale-[0.98]"
                >
                    <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                        <FileText className="w-7 h-7 text-[#f47c20]" />
                    </div>
                    <div className="text-left">
                        <h4 className="font-bold text-[17px] mb-0.5 text-gray-900">View Reports</h4>
                        <p className="text-xs text-gray-400 font-medium">Export daily access logs</p>
                    </div>
                </button>
            </div>

            {/* Active Passes Detail Overlay */}
            {showActiveDetails && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div 
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300"
                        onClick={() => setShowActiveDetails(false)}
                    />
                    
                    {/* Modal Content */}
                    <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
                        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 mb-1">Students On Campus Today</h2>
                                <p className="text-sm text-gray-400 font-medium">Currently showing {activeStudentDetails.length} active verified entries.</p>
                            </div>
                            <button 
                                onClick={() => setShowActiveDetails(false)}
                                className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-all active:scale-95"
                            >
                                <Zap className="w-5 h-5 rotate-45" />
                            </button>
                        </div>
                        
                        <div className="max-h-[60vh] overflow-y-auto px-4 pb-4">
                            <div className="grid gap-3 pt-4">
                                {activeStudentDetails.length === 0 ? (
                                    <div className="py-20 text-center">
                                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <FileText className="w-8 h-8 text-gray-300" />
                                        </div>
                                        <h4 className="text-gray-500 font-bold mb-1">No Active Passes Found</h4>
                                        <p className="text-sm text-gray-400">There are no verified entries recorded for today yet.</p>
                                    </div>
                                ) : (
                                    activeStudentDetails.map((session) => (
                                        <div 
                                            key={session.id}
                                            className="group flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl hover:border-[#f47c20]/20 hover:shadow-md transition-all cursor-pointer"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-sm ring-1 ring-gray-100">
                                                    {session.photoUrl ? (
                                                        <img src={session.photoUrl} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full bg-orange-100 flex items-center justify-center text-[#f47c20] font-bold text-sm">
                                                            {session.studentName ? session.studentName[0].toUpperCase() : 'U'}
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-gray-900 leading-tight group-hover:text-[#f47c20] transition-colors">{session.studentName}</h4>
                                                    <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">
                                                        {session.studentId}
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={(e) => handleClosePass(e, session)}
                                                    className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-all active:scale-90"
                                                    title="Close Pass"
                                                >
                                                    <LogOut className="w-4.5 h-4.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                        
                        <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-center">
                            <button 
                                onClick={() => setShowActiveDetails(false)}
                                className="px-8 py-2.5 bg-white border border-gray-200 text-gray-600 font-bold rounded-xl text-sm shadow-sm hover:text-gray-900 transition-colors"
                            >
                                Close View
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardContent;
