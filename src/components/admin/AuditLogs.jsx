import React, { useState, useEffect } from 'react';
import {
    Search, Bell, Download, Filter, ChevronLeft, ChevronRight,
    RotateCcw, Calendar, User, Zap,
    AlertTriangle, FileText, Loader2, ArrowLeft
} from 'lucide-react';
import { db } from '../../config/firebase';
import { collection, query, orderBy, getDocs, limit, where } from 'firebase/firestore';
import { format } from 'date-fns';

const ActionBadge = ({ action }) => {
    let colors = 'bg-gray-100 text-gray-600';
    if (action.includes('Registered')) colors = 'bg-emerald-50 text-emerald-600 border border-emerald-100';
    if (action.includes('Config')) colors = 'bg-amber-50 text-amber-600 border border-amber-100';
    if (action.includes('Export')) colors = 'bg-blue-50 text-blue-600 border border-blue-100';
    if (action.includes('Revoked')) colors = 'bg-rose-50 text-rose-600 border border-rose-100';
    if (action.includes('Upload')) colors = 'bg-indigo-50 text-indigo-600 border border-indigo-100';
    if (action.includes('Activated')) colors = 'bg-teal-50 text-teal-600 border border-teal-100';
    if (action.includes('Deactivated')) colors = 'bg-orange-50 text-orange-600 border border-orange-100';
    if (action.includes('Role')) colors = 'bg-purple-50 text-purple-600 border border-purple-100';

    return (
        <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${colors}`}>
            {action}
        </span>
    );
};

const AuditLogs = ({ onBack, adminData }) => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        globalTotal: 0,
        total: 0,
        registrations: 0,
        changes: 0
    });

    useEffect(() => {
        fetchLogs();
    }, [adminData?.collegeId]);

    const fetchLogs = async () => {
        if (!adminData?.collegeId) return;
        setLoading(true);
        try {
            // Fetch the last 100 logs
            const logsRef = collection(db, `colleges/${adminData.collegeId}/audit_logs`);
            const q = query(logsRef, orderBy('createdAt', 'desc'), limit(100));
            const snapshot = await getDocs(q);
            
            const fetchedLogs = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                fetchedLogs.push({
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date()
                });
            });
            setLogs(fetchedLogs);

            // Calculate Statistics locally from the recent logs (since Firestore count queries can be expensive/complex without proper indexing for `ilike`)
            // In a production app, you might want cloud functions to maintain these counters.
            
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const last24hLogs = fetchedLogs.filter(log => log.createdAt > yesterday);
            
            const regCount = fetchedLogs.filter(log => log.action?.toLowerCase().includes('registered')).length;
            const configCount = fetchedLogs.filter(log => 
                log.action?.toLowerCase().includes('config') || 
                log.action?.toLowerCase().includes('role')
            ).length;

            setStats({
                globalTotal: fetchedLogs.length, // approximation for UI
                total: last24hLogs.length,
                registrations: regCount,
                changes: configCount
            });
        } catch (error) {
            console.error("Error fetching audit logs:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-[#f8f9fb]">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-[#f47c20] animate-spin" />
                    <p className="text-sm font-black text-gray-500 uppercase tracking-widest italic">Retrieving audit trails...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto p-8 bg-[#f8f9fb]">
            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    {onBack && (
                        <button
                            onClick={onBack}
                            className="w-10 h-10 bg-white border border-gray-100 rounded-xl flex items-center justify-center hover:bg-gray-50 transition-all text-gray-400 hover:text-gray-600 shadow-sm cursor-pointer"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                    )}
                    <div className="w-10 h-10 bg-[#fff4eb] rounded-xl flex items-center justify-center">
                        <RotateCcw className="w-5 h-5 text-[#f47c20]" />
                    </div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight italic">System Audit Logs</h1>
                </div>
                <div className="flex items-center gap-3">
                    <button className="p-2.5 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-gray-600 shadow-sm transition-all cursor-pointer">
                        <Bell className="w-5 h-5" />
                    </button>
                    <button className="flex items-center gap-2 px-6 py-2.5 bg-[#f47c20] text-white font-black rounded-xl text-xs shadow-lg shadow-orange-500/20 hover:bg-[#e06d1c] transition-all active:scale-95 cursor-pointer">
                        <Download className="w-4 h-4" />
                        EXPORT
                    </button>
                </div>
            </div>

            {/* Filter Card */}
            <div className="bg-white rounded-[32px] border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-6 mb-8">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex-1 min-w-[300px] relative">
                        <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search by Admin, Action, or Resource ID..."
                            className="w-full pl-11 pr-4 py-3 bg-[#f8fafc] border border-gray-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#f47c20]/10 transition-all placeholder:text-gray-400"
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <button className="flex items-center gap-2 px-4 py-3 bg-[#f8fafc] border border-gray-100 rounded-2xl text-[11px] font-black text-gray-600 uppercase tracking-wider hover:bg-gray-50 transition-all cursor-pointer">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            Date Range
                            <ChevronRight className="w-3 h-3 rotate-90" />
                        </button>
                        <button className="flex items-center gap-2 px-4 py-3 bg-[#f8fafc] border border-gray-100 rounded-2xl text-[11px] font-black text-gray-600 uppercase tracking-wider hover:bg-gray-50 transition-all cursor-pointer">
                            <User className="w-4 h-4 text-gray-400" />
                            Admin User
                            <ChevronRight className="w-3 h-3 rotate-90" />
                        </button>
                        <button className="flex items-center gap-2 px-4 py-3 bg-[#f8fafc] border border-gray-100 rounded-2xl text-[11px] font-black text-gray-600 uppercase tracking-wider hover:bg-gray-50 transition-all cursor-pointer">
                            <Filter className="w-4 h-4 text-gray-400" />
                            Action Type
                            <ChevronRight className="w-3 h-3 rotate-90" />
                        </button>
                        <button
                            onClick={() => fetchLogs()}
                            className="p-3 bg-orange-50 text-[#f47c20] rounded-2xl hover:bg-orange-100 transition-all active:rotate-180 duration-500 cursor-pointer"
                        >
                            <RotateCcw className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="mt-8 overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-gray-50">
                                <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] px-4">Timestamp</th>
                                <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] px-4">Admin User</th>
                                <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] px-4">Action</th>
                                <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] px-4">Resource</th>
                                <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] px-4">IP Address</th>
                                <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] px-4 text-right">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {logs.map((log) => (
                                <tr key={log.id} className="group hover:bg-gray-50/50 transition-colors">
                                    <td className="py-5 px-4">
                                        <p className="text-[13px] font-bold text-gray-500">
                                            {format(log.createdAt, 'MMM dd, yyyy')} <span className="text-gray-300 mx-1">•</span> {format(log.createdAt, 'HH:mm:ss')}
                                        </p>
                                    </td>
                                    <td className="py-5 px-4 text-[13px] font-black text-gray-900">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-orange-100 text-[#f47c20] flex items-center justify-center text-[10px] font-black">
                                                {(log.adminName || 'U').split(' ').map(n => n[0]).join('')}
                                            </div>
                                            {log.adminName}
                                        </div>
                                    </td>
                                    <td className="py-5 px-4">
                                        <ActionBadge action={log.action || 'Unknown'} />
                                    </td>
                                    <td className="py-5 px-4 text-[13px] font-bold text-gray-500">
                                        {log.resource || 'System'}
                                    </td>
                                    <td className="py-5 px-4 text-[13px] font-bold text-gray-400 font-mono">
                                        {log.ipAddress || '127.0.0.1'}
                                    </td>
                                    <td className="py-5 px-4 text-right">
                                        <button className="text-[11px] font-black text-[#f47c20] hover:underline uppercase tracking-wider cursor-pointer">
                                            View
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {logs.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-2">
                                                <FileText className="w-8 h-8 text-gray-200" />
                                            </div>
                                            <h4 className="text-lg font-black text-gray-900 italic">No Audit Trails Captured</h4>
                                            <p className="text-sm text-gray-400 font-medium max-w-sm mx-auto">
                                                Historical dummy data has been cleared. The system is now monitoring for live administrative activity.
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="mt-8 pt-8 border-t border-gray-50 flex items-center justify-between">
                    <p className="text-xs font-bold text-gray-400 italic">
                        Showing {logs.length > 0 ? 1 : 0} to {logs.length} of {stats.globalTotal} entries
                    </p>
                    <div className="flex items-center gap-2">
                        <button className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-100 text-gray-400 transition-all hover:bg-gray-50 cursor-pointer">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#f47c20] text-white font-black text-sm shadow-md shadow-orange-500/20 cursor-pointer">
                            1
                        </button>
                        <button className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-100 text-gray-600 font-bold text-sm transition-all hover:bg-gray-50 cursor-pointer">
                            2
                        </button>
                        <button className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-100 text-gray-600 font-bold text-sm transition-all hover:bg-gray-50 cursor-pointer">
                            3
                        </button>
                        <span className="text-gray-300 font-black">...</span>
                        <button className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-100 text-gray-600 font-bold text-sm transition-all hover:bg-gray-50 cursor-pointer">
                            129
                        </button>
                        <button className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-100 text-gray-400 transition-all hover:bg-gray-50 cursor-pointer">
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-8">
                <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm flex items-center gap-6 group hover:shadow-md transition-all">
                    <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <FileText className="w-8 h-8 text-[#f47c20] opacity-30" />
                    </div>
                    <div>
                        <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Total Logs (24H)</p>
                        <h4 className="text-3xl font-black text-gray-900">{stats.total}</h4>
                    </div>
                </div>

                <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm flex items-center gap-6 group hover:shadow-md transition-all">
                    <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Zap className="w-8 h-8 text-emerald-500 opacity-30" />
                    </div>
                    <div>
                        <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">New Registrations</p>
                        <h4 className="text-3xl font-black text-gray-900">{stats.registrations}</h4>
                    </div>
                </div>

                <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm flex items-center gap-6 group hover:shadow-md transition-all">
                    <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <AlertTriangle className="w-8 h-8 text-amber-500 opacity-30" />
                    </div>
                    <div>
                        <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Config Changes</p>
                        <h4 className="text-3xl font-black text-gray-900">{stats.changes}</h4>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuditLogs;
