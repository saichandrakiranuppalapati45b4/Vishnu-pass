import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronDown, TrendingUp, Clock, ArrowUpRight, Loader2, X, Filter, Search, Eye, ShieldCheck, ChevronRight } from 'lucide-react';
import { supabase } from '../../config/supabase';
import { formatDistanceToNow, format } from 'date-fns';
import VerificationResult from '../student/VerificationResult';

// Helper function to generate a consistent color from a name
const stringToColor = (name) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = '#';
    for (let i = 0; i < 3; i++) {
        const value = (hash >> (i * 8)) & 0xff;
        color += `00${value.toString(16)}`.slice(-2);
    }
    return color;
};

// Helper function to get access category
const getAccessCategory = (log) => {
    const status = (log.status || '').toLowerCase();
    const type = (log.movement_type || log.movementType || '').toUpperCase();
    
    if (status === 'completed' || status === 'approved' || status === 'success') return 'AUTHORIZED';
    if (status === 'expired' && type === 'OUT') return 'AUTHORIZED';
    
    if (['rejected', 'denied', 'error'].includes(status)) return 'ACCESS DENIED';
    if (status === 'expired' && type === 'IN') return 'ACCESS DENIED';
    
    return 'OTHERS';
};

const Reports = ({ collegeData }) => {
    const [logs, setLogs] = useState([]);
    const [stats, setStats] = useState({
        total: 0,
        weeklyIncrease: 0,
        peakHour: 'N/A',
        peakHourEntries: 0,
        monthlyIn: 0,
        monthlyOut: 0
    });
    const [accessTypes, setAccessTypes] = useState({
        authorized: 0,
        denied: 0,
        others: 0
    });
    const [trendData, setTrendData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState(7); // default 7 days
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [allLogsState, setAllLogsState] = useState([]);

    // Pass Card and Modal State
    const [selectedLog, setSelectedLog] = useState(null);
    const [loadingStudentData, setLoadingStudentData] = useState(false);
    const [isViewAllOpen, setIsViewAllOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState('ALL');
    const [showFilterPills, setShowFilterPills] = useState(false);

    // Handle clicking a log to view their Pass Card
    const handleLogClick = async (log) => {
        if (!log) return;
        setSelectedLog({ ...log, studentData: null });
        setLoadingStudentData(true);

        try {
            const sId = log.student_id || log.studentId || log.user_name;
            let studentData = null;

            if (sId) {
                const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sId);
                let query = supabase.from('students').select('*, departments(name)');
                if (isUuid) {
                    query = query.or(`id.eq.${sId},student_id.eq.${sId}`);
                } else {
                    query = query.or(`student_id.eq.${sId},student_id.ilike.${sId}`);
                }
                const { data } = await query.maybeSingle();
                studentData = data;
            }

            if (!studentData && (log.user_name || log.studentName)) {
                const nameSearch = log.user_name || log.studentName;
                const { data } = await supabase
                    .from('students')
                    .select('*, departments(name)')
                    .or(`full_name.ilike.${nameSearch},email.ilike.${nameSearch}`)
                    .maybeSingle();
                studentData = data;
            }

            if (studentData) {
                setSelectedLog({
                    ...log,
                    studentData: {
                        ...studentData,
                        full_name: studentData.full_name || log.studentName || log.user_name || 'Student',
                        student_id: studentData.student_id || log.studentId || sId,
                        departments: studentData.departments || { name: studentData.department || 'Computer Science Engineering' }
                    }
                });
            } else {
                setSelectedLog({
                    ...log,
                    studentData: {
                        full_name: log.studentName || log.user_name || 'Student',
                        student_id: log.studentId || log.student_id || sId || '24pa1a45b4',
                        departments: { name: 'Computer Science Engineering' },
                        photo_url: log.photoUrl || null,
                        year_of_study: '3',
                        batch: '2024-2028',
                        campus: 'Main Campus',
                        hostel_type: 'Day Scholar',
                        status: 'Active'
                    }
                });
            }
        } catch (err) {
            console.error("Error loading pass details:", err);
            setSelectedLog({
                ...log,
                studentData: {
                    full_name: log.studentName || log.user_name || 'Student',
                    student_id: log.studentId || log.student_id || '24pa1a45b4',
                    departments: { name: 'Computer Science Engineering' },
                    photo_url: log.photoUrl || null,
                    status: 'Active'
                }
            });
        } finally {
            setLoadingStudentData(false);
        }
    };

    const fetchReports = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('movement_logs')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            const fetchedLogs = (data || []).map(d => ({
                id: d.id,
                ...d,
                studentName: d.user_name || d.student_id,
                studentId: d.student_id,
                movementType: d.movement_type,
                scannedAtDate: d.created_at ? new Date(d.created_at) : new Date()
            }));

            setAllLogsState(fetchedLogs);
        } catch (error) {
            console.error("Error fetching reports:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, []);

    useEffect(() => {
        if (loading || allLogsState.length === 0) return;

        const allLogs = allLogsState;
        
        // 2. Calculate Stats
        const now = new Date();
        const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const prev7Days = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

        const logsLast7Days = allLogs.filter(l => l.scannedAtDate >= last7Days);
        const logsPrev7Days = allLogs.filter(l => l.scannedAtDate >= prev7Days && l.scannedAtDate < last7Days);

        const total = allLogs.length;
        const weeklyInc = logsPrev7Days.length > 0
            ? ((logsLast7Days.length - logsPrev7Days.length) / logsPrev7Days.length) * 100
            : 0;

        // Group by hour for peak hour
        const hourCounts = {};
        allLogs.forEach(l => {
            const hour = l.scannedAtDate.getHours();
            hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        });
        const peakHourId = Object.keys(hourCounts).reduce((a, b) => hourCounts[a] > hourCounts[b] ? a : b, '0');
        const peakHourStr = `${peakHourId.padStart(2, '0')}:00 - ${(parseInt(peakHourId) + 1).toString().padStart(2, '0')}:00`;

        setStats({
            total,
            weeklyIncrease: weeklyInc.toFixed(1),
            peakHour: peakHourStr,
            peakHourEntries: peakHourId in hourCounts ? Math.round(hourCounts[peakHourId] / 7) : 0,
            monthlyIn: allLogs.filter(l => {
                const date = l.scannedAtDate;
                const isThisMonth = date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                if (!isThisMonth) return false;
                const type = (l.movementType || '').toLowerCase();
                return type.includes('entry') || type.includes('authorized') || type.includes('in');
            }).length,
            monthlyOut: allLogs.filter(l => {
                const date = l.scannedAtDate;
                const isThisMonth = date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                if (!isThisMonth) return false;
                const type = (l.movementType || '').toLowerCase();
                return !(type.includes('entry') || type.includes('authorized') || type.includes('in'));
            }).length
        });

        // 3. Access Types (Categorized by actual status results)
        let authorized = 0;
        let denied = 0;
        let others = 0;

        allLogs.forEach(l => {
            const status = (l.status || '').toLowerCase();
            const mType = (l.movementType || '').toUpperCase();

            if (status === 'completed' || status === 'approved') {
                authorized++;
            } else if (['rejected', 'denied', 'expired', 'error'].includes(status)) {
                denied++;
            } else {
                others++;
            }
        });

        setAccessTypes({ authorized, denied, others });

        // 4. Trend Data (Dynamic based on dateRange)
        const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
        const trend = Array(dateRange).fill(0).map((_, i) => {
            const date = new Date(now.getTime() - (dateRange - 1 - i) * 24 * 60 * 60 * 1000);
            const count = allLogs.filter(l => l.scannedAtDate.toDateString() === date.toDateString()).length;
            return { 
                day: dateRange > 3 ? days[date.getDay()] : formatDistanceToNow(date, { addSuffix: true }).replace('about ', ''), 
                count 
            };
        });
        
        // For 1 day, we might want hourly data instead of just 1 point, 
        // but keeping it simple to day-level for consistency unless specified
        if (dateRange === 1) {
            trend[0].day = 'Today';
        }

        setTrendData(trend);

        // 5. Recent Logs
        setLogs(allLogs.slice(0, 10));

    }, [allLogsState, dateRange, loading]);


    // Calculate chart path based on dynamic trendData
    const maxVal = Math.max(...trendData.map(d => d.count), 10);
    const getChartPath = () => {
        if (trendData.length === 0) return '';
        if (trendData.length === 1) {
            // Flat line for 1 data point
            return `M 30 ${160 - (trendData[0].count / maxVal) * 120} L 520 ${160 - (trendData[0].count / maxVal) * 120}`;
        }
        
        const width = 490;
        const height = 120;
        const spacing = width / (trendData.length - 1);

        let path = `M 30 ${160 - (trendData[0].count / maxVal) * height}`;
        trendData.slice(1).forEach((d, i) => {
            path += ` L ${30 + (i + 1) * spacing} ${160 - (d.count / maxVal) * height}`;
        });
        return path;
    };

    const getChartFill = () => {
        const path = getChartPath();
        if (!path) return '';
        return `${path} L 520 180 L 30 180 Z`;
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-gray-50/30">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-[#f47c20] animate-spin" />
                    <p className="text-sm font-semibold text-gray-500">Generating real-time analytics...</p>
                </div>
            </div>
        );
    }

    const totalAccess = accessTypes.authorized + accessTypes.denied + accessTypes.others || 1;
    const authPct = Math.round((accessTypes.authorized / totalAccess) * 100);
    const deniedPct = Math.round((accessTypes.denied / totalAccess) * 100);
    const otherPct = 100 - authPct - deniedPct;

    const strokeDash = 376.99; // 2 * PI * 60
    const authOffset = 0;
    const deniedOffset = -(authPct / 100) * strokeDash;
    const otherOffset = -((authPct + deniedPct) / 100) * strokeDash;
    
    return (
        <div className="flex-1 overflow-y-auto p-8">

            {/* Stat Cards */}
            <div className="grid grid-cols-3 gap-5 mb-8">
                {/* Total Movement */}
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Movement</p>
                        <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
                            <TrendingUp className="w-4 h-4 text-red-500" />
                        </div>
                    </div>
                    <h3 className="text-[28px] font-bold text-gray-900 leading-tight mb-1">{stats.total.toLocaleString()}</h3>
                    <div className="flex items-center gap-4 mt-2 mb-1">
                        <div>
                            <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-tight">Monthly In</p>
                            <p className="text-lg font-black text-emerald-600">{stats.monthlyIn.toLocaleString()}</p>
                        </div>
                        <div className="w-px h-8 bg-gray-100"></div>
                        <div>
                            <p className="text-[10px] font-bold text-orange-500 uppercase tracking-tight">Monthly Out</p>
                            <p className="text-lg font-black text-orange-600">{stats.monthlyOut.toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                {/* Peak Hour */}
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Peak Hour</p>
                        <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
                            <Clock className="w-4 h-4 text-[#f47c20]" />
                        </div>
                    </div>
                    <h3 className="text-[28px] font-bold text-gray-900 leading-tight mb-1">{stats.peakHour}</h3>
                    <p className="text-xs text-gray-400 font-medium">Average {stats.peakHourEntries} entries/hr</p>
                </div>

                {/* Weekly Increase */}
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Weekly Increase</p>
                        <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                            <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                        </div>
                    </div>
                    <h3 className="text-[28px] font-bold text-emerald-600 leading-tight mb-1">+{authPct}%</h3>
                    <p className="text-xs text-gray-400 font-medium">Authorized Authorization Rate</p>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-5 gap-6 mb-8">
                {/* Gate Activity Trends */}
                <div className="col-span-3 bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-6">
                    <div className="flex items-start justify-between mb-2">
                        <div>
                            <h3 className="font-bold text-gray-900 text-[15px] mb-1">Gate Activity Trends</h3>
                            <p className="text-xs text-gray-400 font-medium">Activity volume for the last {dateRange} days</p>
                        </div>
                        <div className="relative">
                            <button 
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                            >
                                {dateRange === 1 ? 'Today' : `Last ${dateRange} Days`}
                                <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>
                            
                            {/* Dropdown Menu */}
                            {isDropdownOpen && (
                                <div className="absolute top-full right-0 mt-2 w-36 bg-white border border-gray-100 rounded-xl shadow-lg shadow-gray-200/50 py-1 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                    {[7, 5, 3, 2, 1].map((range) => (
                                        <button
                                            key={range}
                                            onClick={() => {
                                                setDateRange(range);
                                                setIsDropdownOpen(false);
                                            }}
                                            className={`w-full text-left px-4 py-2 text-xs font-bold transition-colors cursor-pointer ${
                                                dateRange === range ? 'bg-orange-50 text-[#f47c20]' : 'text-gray-600 hover:bg-gray-50'
                                            }`}
                                        >
                                            {range === 1 ? '1 Day (Today)' : `${range} Days`}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Chart SVG */}
                    <div className="mt-4">
                        <svg viewBox="0 0 550 200" className="w-full h-[180px]" preserveAspectRatio="none">
                            {/* Grid lines */}
                            <line x1="30" y1="40" x2="520" y2="40" stroke="#f1f5f9" strokeWidth="1" />
                            <line x1="30" y1="80" x2="520" y2="80" stroke="#f1f5f9" strokeWidth="1" />
                            <line x1="30" y1="120" x2="520" y2="120" stroke="#f1f5f9" strokeWidth="1" />
                            <line x1="30" y1="160" x2="520" y2="160" stroke="#f1f5f9" strokeWidth="1" />

                            {/* Fill area */}
                            <path d={getChartFill()} fill="url(#orangeGradient)" />

                            {/* Line */}
                            <path d={getChartPath()} fill="none" stroke="#f47c20" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                            {/* Dynamic Dots at keys */}
                            {trendData.map((d, i) => {
                                if (trendData.length === 1) {
                                    return <circle key={i} cx={275} cy={160 - (d.count / maxVal) * 120} r="4" fill="#f47c20" />;
                                }
                                const width = 490;
                                const height = 120;
                                const spacing = width / (trendData.length - 1);
                                return <circle key={i} cx={30 + i * spacing} cy={160 - (d.count / maxVal) * height} r="4" fill="#f47c20" />;
                            })}

                            {/* Gradient definition */}
                            <defs>
                                <linearGradient id="orangeGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#f47c20" stopOpacity="0.15" />
                                    <stop offset="100%" stopColor="#f47c20" stopOpacity="0.01" />
                                </linearGradient>
                            </defs>
                        </svg>
                        {/* X-axis labels */}
                        <div className="flex justify-between px-4 mt-1">
                            {trendData.length === 1 ? (
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mx-auto">
                                    {trendData[0].day}
                                </span>
                            ) : (
                                trendData.map((d, i) => (
                                    <span key={i} className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                        {d.day}
                                    </span>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Access Types Donut */}
                <div className="col-span-2 bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-6">
                    <div className="mb-4">
                        <h3 className="font-bold text-gray-900 text-[15px] mb-1">Access Types</h3>
                        <p className="text-xs text-gray-400 font-medium">Breakdown of entry authorization</p>
                    </div>

                    {/* Donut Chart */}
                    <div className="flex items-center justify-center mb-5">
                        <div className="relative">
                            <svg width="160" height="160" viewBox="0 0 160 160">
                                {/* Background */}
                                <circle cx="80" cy="80" r="60" fill="none" stroke="#f1f5f9" strokeWidth="20" />
                                {/* Authorized */}
                                <circle cx="80" cy="80" r="60" fill="none" stroke="#f47c20" strokeWidth="20"
                                    strokeDasharray={`${(authPct / 100) * strokeDash} ${strokeDash}`}
                                    strokeDashoffset={authOffset}
                                    transform="rotate(-90 80 80)"
                                    strokeLinecap="round"
                                />
                                {/* Access Denied */}
                                <circle cx="80" cy="80" r="60" fill="none" stroke="#f43f5e" strokeWidth="20"
                                    strokeDasharray={`${(deniedPct / 100) * strokeDash} ${strokeDash}`}
                                    strokeDashoffset={deniedOffset}
                                    transform="rotate(-90 80 80)"
                                    strokeLinecap="round"
                                />
                                {/* Others */}
                                <circle cx="80" cy="80" r="60" fill="none" stroke="#7c3aed" strokeWidth="20"
                                    strokeDasharray={`${(otherPct / 100) * strokeDash} ${strokeDash}`}
                                    strokeDashoffset={otherOffset}
                                    transform="rotate(-90 80 80)"
                                    strokeLinecap="round"
                                />
                            </svg>
                            {/* Center text */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-2xl font-bold text-gray-900">{stats.total.toLocaleString()}</span>
                                <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Total</span>
                            </div>
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]"></span>
                                <span className="text-sm text-gray-600 font-medium">Authorized</span>
                            </div>
                            <span className="text-sm font-bold text-gray-900">{authPct}%</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#f43f5e]"></span>
                                <span className="text-sm text-gray-600 font-medium">Access Denied</span>
                            </div>
                            <span className="text-sm font-bold text-gray-900">{deniedPct}%</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#7c3aed]"></span>
                                <span className="text-sm text-gray-600 font-medium">Others</span>
                            </div>
                            <span className="text-sm font-bold text-gray-900">{otherPct}%</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Logs Header & Controls */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
                <div className="p-5 border-b border-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h3 className="font-bold text-gray-900 text-[15px] flex items-center gap-2">
                            Recent Logs
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-[#f47c20] border border-orange-100">
                                Click any row to view Pass Card
                            </span>
                        </h3>
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => setShowFilterPills(prev => !prev)}
                            className={`text-sm font-medium px-3 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                                showFilterPills || filterCategory !== 'ALL'
                                    ? 'bg-orange-50 border-orange-200 text-[#f47c20]'
                                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            <Filter className="w-3.5 h-3.5" />
                            Filter {filterCategory !== 'ALL' ? `(${filterCategory})` : ''}
                        </button>
                        <button 
                            onClick={() => setIsViewAllOpen(true)}
                            className="text-sm font-semibold px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-[#d96a18] text-white transition-all cursor-pointer shadow-sm active:scale-95"
                        >
                            View All ({allLogsState.length})
                        </button>
                    </div>
                </div>

                {/* Filter Pills */}
                {showFilterPills && (
                    <div className="px-5 py-3 bg-gray-50/70 border-b border-gray-100 flex flex-wrap items-center gap-2 animate-in fade-in duration-200">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-2">Filter By:</span>
                        {[
                            { label: 'All Logs', val: 'ALL' },
                            { label: 'Entry (IN)', val: 'IN' },
                            { label: 'Exit (OUT)', val: 'OUT' },
                            { label: 'Authorized', val: 'AUTHORIZED' },
                            { label: 'Access Denied', val: 'DENIED' }
                        ].map(f => (
                            <button
                                key={f.val}
                                onClick={() => setFilterCategory(f.val)}
                                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    filterCategory === f.val
                                        ? 'bg-[#f47c20] text-white shadow-sm'
                                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                                }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-gray-100 bg-gray-50/40">
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">User Details</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Access Point</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Type</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Timestamp</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {(() => {
                                const filteredLogs = logs.filter(l => {
                                    if (filterCategory === 'ALL') return true;
                                    const cat = getAccessCategory(l);
                                    const type = (l.movement_type || l.movementType || '').toUpperCase();
                                    if (filterCategory === 'IN') return type === 'IN' || type === 'ENTRY';
                                    if (filterCategory === 'OUT') return type === 'OUT' || type === 'EXIT';
                                    if (filterCategory === 'AUTHORIZED') return cat === 'AUTHORIZED';
                                    if (filterCategory === 'DENIED') return cat === 'ACCESS DENIED';
                                    return true;
                                });

                                if (filteredLogs.length === 0) {
                                    return (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-12 text-center text-gray-400 font-medium">
                                                No logs match the selected filter.
                                            </td>
                                        </tr>
                                    );
                                }

                                return filteredLogs.map((log) => (
                                    <tr 
                                        key={log.id} 
                                        onClick={() => handleLogClick(log)}
                                        className="hover:bg-orange-50/40 transition-colors cursor-pointer group"
                                        title="Click to view digital pass card"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                {log.photoUrl ? (
                                                    <img
                                                        src={log.photoUrl}
                                                        alt={log.studentName || 'Student'}
                                                        className="w-9 h-9 rounded-full object-cover flex-shrink-0 border border-gray-100 shadow-sm group-hover:scale-105 transition-transform"
                                                    />
                                                ) : (
                                                    <div
                                                        className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 group-hover:scale-105 transition-transform"
                                                        style={{ backgroundColor: stringToColor(log.studentName || 'U') }}
                                                    >
                                                        {(log.studentName || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-semibold text-gray-900 text-sm group-hover:text-[#f47c20] transition-colors flex items-center gap-1.5">
                                                        {log.studentName || 'Guest'}
                                                    </p>
                                                    <p className="text-xs text-gray-400 font-medium">{log.studentId ? `ID: #${log.studentId}` : 'Guest'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 font-medium">{log.gateId || log.gate_id || 'Gate'}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md ${(log.movementType?.toUpperCase() === 'IN' || log.movementType?.toUpperCase() === 'ENTRY') ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                                                {log.movementType || log.movement_type || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {(() => {
                                                const s = (log.status || '').toLowerCase();
                                                const type = (log.movementType || log.movement_type || '').toUpperCase();
                                                const isAuth = ['success', 'completed', 'approved'].includes(s) || (s === 'expired' && type === 'OUT');
                                                const isDenied = ['rejected', 'denied', 'error'].includes(s) || (s === 'expired' && type === 'IN');
                                                
                                                return (
                                                    <span className={`text-sm font-semibold ${isAuth ? 'text-emerald-600' : 'text-rose-600'} flex items-center gap-1.5`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${isAuth ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                                                        {isAuth ? (s === 'expired' ? 'Checked Out' : 'Authorized') : 
                                                         isDenied ? 'Access Denied' : log.status}
                                                    </span>
                                                );
                                            })()}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 font-medium text-xs whitespace-nowrap">
                                            {format(log.scannedAtDate, 'MMM d, yyyy h:mm a')}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="inline-flex items-center gap-1 text-xs font-bold text-[#f47c20] bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-100 group-hover:bg-[#f47c20] group-hover:text-white transition-all shadow-xs">
                                                <Eye className="w-3.5 h-3.5" />
                                                Pass
                                            </span>
                                        </td>
                                    </tr>
                                ));
                            })()}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* View All Logs Modal */}
            {isViewAllOpen && (
                <div 
                    className="fixed inset-0 z-[90] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setIsViewAllOpen(false)}
                >
                    <div 
                        className="bg-white rounded-3xl w-full max-w-5xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                            <div>
                                <h2 className="text-xl font-black text-gray-900 tracking-tight">All Access & Movement Logs</h2>
                                <p className="text-xs text-gray-500 font-medium mt-0.5">
                                    Total {allLogsState.length} access records logged. Click any entry to view their verified digital pass.
                                </p>
                            </div>
                            <button
                                onClick={() => setIsViewAllOpen(false)}
                                className="w-10 h-10 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-colors cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Search & Filter Bar */}
                        <div className="px-6 py-4 bg-gray-50/70 border-b border-gray-100 flex flex-col sm:flex-row gap-3 items-center justify-between">
                            <div className="relative w-full sm:w-80">
                                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    placeholder="Search student ID, name, gate..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#f47c20] shadow-2xs"
                                />
                            </div>

                            <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto">
                                {['ALL', 'IN', 'OUT', 'AUTHORIZED', 'DENIED'].map(c => (
                                    <button
                                        key={c}
                                        onClick={() => setFilterCategory(c)}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                            filterCategory === c
                                                ? 'bg-[#f47c20] text-white shadow-xs'
                                                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                                        }`}
                                    >
                                        {c}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Modal Table Content */}
                        <div className="flex-1 overflow-y-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-gray-50/50 sticky top-0 z-5">
                                        <th className="px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">User Details</th>
                                        <th className="px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Access Point</th>
                                        <th className="px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Type</th>
                                        <th className="px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Timestamp</th>
                                        <th className="px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Pass Card</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {(() => {
                                        const query = searchQuery.trim().toLowerCase();
                                        const filteredAll = allLogsState.filter(l => {
                                            const matchesSearch = !query || 
                                                (l.studentName || '').toLowerCase().includes(query) ||
                                                (l.studentId || '').toLowerCase().includes(query) ||
                                                (l.gateId || l.gate_id || '').toLowerCase().includes(query) ||
                                                (l.user_name || '').toLowerCase().includes(query);
                                            
                                            if (!matchesSearch) return false;
                                            if (filterCategory === 'ALL') return true;
                                            
                                            const cat = getAccessCategory(l);
                                            const type = (l.movement_type || l.movementType || '').toUpperCase();
                                            if (filterCategory === 'IN') return type === 'IN' || type === 'ENTRY';
                                            if (filterCategory === 'OUT') return type === 'OUT' || type === 'EXIT';
                                            if (filterCategory === 'AUTHORIZED') return cat === 'AUTHORIZED';
                                            if (filterCategory === 'DENIED') return cat === 'ACCESS DENIED';
                                            return true;
                                        });

                                        if (filteredAll.length === 0) {
                                            return (
                                                <tr>
                                                    <td colSpan="6" className="px-6 py-16 text-center text-gray-400 font-medium">
                                                        No logs found matching "{searchQuery}"
                                                    </td>
                                                </tr>
                                            );
                                        }

                                        return filteredAll.map((log) => (
                                            <tr 
                                                key={log.id}
                                                onClick={() => handleLogClick(log)}
                                                className="hover:bg-orange-50/40 transition-colors cursor-pointer group"
                                            >
                                                <td className="px-6 py-3.5">
                                                    <div className="flex items-center gap-3">
                                                        {log.photoUrl ? (
                                                            <img
                                                                src={log.photoUrl}
                                                                alt={log.studentName || 'Student'}
                                                                className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-gray-100 shadow-xs"
                                                            />
                                                        ) : (
                                                            <div
                                                                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
                                                                style={{ backgroundColor: stringToColor(log.studentName || 'U') }}
                                                            >
                                                                {(log.studentName || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                                            </div>
                                                        )}
                                                        <div>
                                                            <p className="font-semibold text-gray-900 text-xs group-hover:text-[#f47c20] transition-colors">
                                                                {log.studentName || 'Guest'}
                                                            </p>
                                                            <p className="text-[11px] text-gray-400 font-medium">{log.studentId ? `ID: #${log.studentId}` : 'Guest'}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3.5 text-gray-600 font-medium text-xs">{log.gateId || log.gate_id || 'Gate'}</td>
                                                <td className="px-6 py-3.5">
                                                    <span className={`inline-flex px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded ${(log.movementType?.toUpperCase() === 'IN' || log.movementType?.toUpperCase() === 'ENTRY') ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                                                        {log.movementType || log.movement_type || 'N/A'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3.5">
                                                    {(() => {
                                                        const s = (log.status || '').toLowerCase();
                                                        const type = (log.movementType || log.movement_type || '').toUpperCase();
                                                        const isAuth = ['success', 'completed', 'approved'].includes(s) || (s === 'expired' && type === 'OUT');
                                                        const isDenied = ['rejected', 'denied', 'error'].includes(s) || (s === 'expired' && type === 'IN');
                                                        
                                                        return (
                                                            <span className={`text-xs font-semibold ${isAuth ? 'text-emerald-600' : 'text-rose-600'} flex items-center gap-1.5`}>
                                                                <span className={`w-1.5 h-1.5 rounded-full ${isAuth ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                                                                {isAuth ? (s === 'expired' ? 'Checked Out' : 'Authorized') : 
                                                                 isDenied ? 'Access Denied' : log.status}
                                                            </span>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="px-6 py-3.5 text-gray-500 font-medium text-xs whitespace-nowrap">
                                                    {format(log.scannedAtDate, 'MMM d, yyyy h:mm a')}
                                                </td>
                                                <td className="px-6 py-3.5 text-right">
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#f47c20] bg-orange-50 px-2 py-0.5 rounded-md border border-orange-100 group-hover:bg-[#f47c20] group-hover:text-white transition-all">
                                                        <Eye className="w-3 h-3" />
                                                        View Pass
                                                    </span>
                                                </td>
                                            </tr>
                                        ));
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Verification Result / Pass Card Slide-over Drawer */}
            {selectedLog && (
                <div 
                    className="fixed inset-0 z-[100] flex justify-end bg-black/50 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
                    onClick={() => setSelectedLog(null)}
                >
                    <div 
                        className="w-[480px] max-w-full bg-white h-full shadow-2xl animate-in slide-in-from-right duration-300 overflow-y-auto relative flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        {loadingStudentData ? (
                            <div className="flex justify-center flex-col items-center h-full gap-4 p-8">
                                <Loader2 className="w-12 h-12 text-[#f47c20] animate-spin" />
                                <p className="text-gray-700 font-bold text-sm tracking-wide uppercase">Retrieving Pass Card...</p>
                            </div>
                        ) : (
                            <VerificationResult 
                                studentData={selectedLog.studentData}
                                gateName={selectedLog.gateId || selectedLog.gate_id || 'Main Gate'}
                                verifiedAt={selectedLog.created_at ? format(new Date(selectedLog.created_at), 'hh:mm a') : format(new Date(), 'hh:mm a')}
                                onNextScan={() => setSelectedLog(null)}
                                warning={selectedLog.warning}
                                status={selectedLog.status}
                                hideNavBar={true}
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Reports;
